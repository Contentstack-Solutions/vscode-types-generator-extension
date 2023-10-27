import * as ContentstackTypes from "../models/contentstack-schema";
import * as _ from "lodash";

import { GlobalFieldCache, Imports, TsTypesResult, TypeFlags, TypeGeneratorOptions, TypeMap } from "../models/models";

import { DocumentationGenerator } from "./docgen/doc";
import JSDocumentationGenerator from "./docgen/jsdoc";
import NullDocumentationGenerator from "./docgen/nulldoc";
import builtInTypesFactory from "./stack/builtins";
import { defaultOptions } from "./default-options";

const typesFactory = (userOptions: TypeGeneratorOptions) => {
  let currentType: string = "";
  let imports: Imports = {};
  const builtins = builtInTypesFactory(userOptions);
  const docgen: DocumentationGenerator = userOptions.includeDocumentation
    ? new JSDocumentationGenerator()
    : new NullDocumentationGenerator();

  const options = Object.assign({}, defaultOptions, userOptions);
  const visitedJSTypes = new Set<string>();
  const visitedCSTypes = new Set<string>();
  const visitedGlobalFields = new Set<string>();
  const visitedContentTypes = new Set<string>();
  const cachedGlobalFields: GlobalFieldCache = {};
  const typeMap: TypeMap = {
    text: { func: addText, track: true, flag: TypeFlags.builtinJS },
    number: { func: addNumber, track: true, flag: TypeFlags.builtinJS },
    isodate: { func: addText, track: true, flag: TypeFlags.builtinJS },
    boolean: { func: addBoolean, track: true, flag: TypeFlags.builtinJS },
    blocks: {
      func: userOptions.inlineModularBlocks ? addInlineModularBlockField : addTypeModularBlockField,
      track: false,
      flag: TypeFlags.userReference,
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    global_field: {
      func: addGlobalField,
      track: true,
      flag: TypeFlags.userGlobalField,
    },
    group: { func: addGroupField, track: false, flag: TypeFlags.userGroup },
    link: { func: addLink, track: true, flag: TypeFlags.builtinCS },
    file: { func: addFile, track: true, flag: TypeFlags.builtinCS },
    reference: {
      func: addReference,
      track: true,
      flag: TypeFlags.userReference,
    },
  };

  function addImport(currentTypeName: string, importType: string, useNameType: boolean = true) {
    //Avoids circular imports
    if (
      currentType.toLowerCase() === importType.toLowerCase() ||
      (nameType(currentType) === importType && !useNameType)
    ) {
      // console.log("Skipping import for ", currentType, importType);
      return;
    }
    // const importPath = `import ${nameType(importType)} from "./${nameType(importType)}";`;
    const importPath = !useNameType
      ? `import ${importType} from "./${importType}";`
      : `import ${nameType(importType)} from "./${nameType(importType)}";`;
    if (!imports[currentTypeName]) {
      imports[currentTypeName] = [importPath];
    } else {
      if (!imports[currentTypeName].some((v) => v === importPath)) {
        imports[currentTypeName].push(importPath);
      }
    }
  }
  function trackDependency(field: ContentstackTypes.Field, type: string, flag: TypeFlags) {
    if (flag === TypeFlags.builtinJS) {
      visitedJSTypes.add(type);
    } else if (flag === TypeFlags.userGlobalField) {
      const _type = nameType(field.reference_to);
      visitedGlobalFields.add(_type);

      if (!cachedGlobalFields[_type]) {
        cachedGlobalFields[_type] = {
          uid: _type,
          name: _type,
          definition: addContentType(field),
        };
      }
    } else if (flag === TypeFlags.builtinCS) {
      visitedCSTypes.add(type);
    } else if (flag === TypeFlags.userReference) {
      if (Array.isArray(field.reference_to)) {
        field.reference_to.forEach((v) => {
          visitedContentTypes.add(nameType(v));
        });
      }
    }
  }

  function nameType(uid: string) {
    return [options.prefix, _.upperFirst(_.camelCase(uid))].filter((v) => v).join("");
  }

  function defineInterface(contentType: ContentstackTypes.ContentType | ContentstackTypes.GlobalField) {
    if (
      options.splitFiles &&
      contentType.data_type !== "global_field" &&
      contentType.data_type !== "modular_block" &&
      contentType.data_type !== "reference"
    ) {
      addImport(currentType, builtins.baseTypes.publishableContent, false); //nameType is already calculated
    }
    return [
      userOptions.splitFiles ? "export default interface" : "export interface",
      nameType(contentType.data_type === "global_field" ? (contentType.reference_to as string) : contentType.uid),
      contentType.data_type === "modular_block" || contentType.data_type === "global_field"
        ? ""
        : ` extends ${builtins.baseTypes.publishableContent}`,
    ].join(" ");
  }

  function arrayProperty(type: string, field: ContentstackTypes.Field) {
    let op = "";

    if (field.multiple) {
      op = "[]";

      if (field.max_instance) {
        const elements = new Array(field.max_instance).fill(type as any);
        return ["[", elements.join(", "), "]"].join("");
      }
    }

    return type + op;
  }

  function requiredProperty(required: boolean) {
    return required ? "" : "?";
  }

  function parenthesis(block: string) {
    return `(${block})`;
  }

  function addFieldChoices(field: ContentstackTypes.Field) {
    const choices = field.enum.choices;
    const length = choices.length;

    if (!choices && !length) {
      return "";
    }

    function getValue(choice: { value: string }) {
      if (field.data_type === "number") {
        return choice.value;
      }

      return `${JSON.stringify(choice.value)}`;
    }

    return parenthesis(choices.map((v) => getValue(v)).join(" | "));
  }

  function addBlockNames(field: ContentstackTypes.Field, except: ContentstackTypes.Block) {
    const uids: string[] = [];

    field.blocks.forEach((block) => {
      if (block.uid !== except.uid) {
        uids.push(`${block.uid}: undefined;`);
      }
    });

    return uids.join("\n");
  }

  function addFieldType(field: ContentstackTypes.Field, parentUid?: string) {
    let type = "any";

    if (field.enum) {
      type = addFieldChoices(field);
    } else {
      const match = typeMap[field.data_type];

      if (match) {
        type = match.func(field, parentUid);
        if (match.track) {
          trackDependency(field, type, match.flag);
        }
      }
    }

    return arrayProperty(type, field);
  }

  function addField(field: ContentstackTypes.Field, parentUid?: string) {
    // console.log("field", field.uid, "currentType", currentType, "parentUid", parentUid, "data_type", field.data_type);
    let fieldType = "";
    if (field.data_type === "global_field" && cachedGlobalFields[nameType(field.reference_to)]) {
      addImport(currentType, field.reference_to);
      fieldType = nameType(field.reference_to);
    }
    if (field.data_type === "reference" && field.reference_to) {
      if (Array.isArray(field.reference_to)) {
        field.reference_to.forEach((v) => {
          addImport(currentType, v);
        });
      } else {
        addImport(currentType, field.reference_to);
      }
    }

    return [
      field.uid + requiredProperty(field.mandatory) + ":",
      fieldType || addFieldType(field, parentUid) + ";",
    ].join(" ");
  }

  function addFields(schema: ContentstackTypes.Schema, parentUid?: string) {
    return schema
      .map((v) => {
        return [docgen.field(v.display_name), addField(v, parentUid)].filter((v) => v).join("\n");
      })
      .join("\n");
  }

  function addContentType(contentType: ContentstackTypes.ContentType | ContentstackTypes.GlobalField) {
    currentType = contentType.uid;
    return [
      docgen.interface(contentType.description),
      defineInterface(contentType),
      "{",
      addFields(contentType.schema, contentType.uid),
      "}",
    ]
      .filter((v) => v)
      .join("\n");
  }

  function addInlineModularBlock(field: ContentstackTypes.Field, block: ContentstackTypes.Block) {
    return (
      "{" +
      [
        block.uid + ":",
        block.reference_to ? nameType(block.reference_to as string) + ";" : "{" + addFields(block.schema || []) + "};",
      ].join(" ") +
      addBlockNames(field, block) +
      "}"
    );
  }
  function addTypeModularBlock(field: ContentstackTypes.Field, block: ContentstackTypes.Block, parentUid?: string) {
    const uid = options.verboseModularBlocks ? `${parentUid}_${field.uid}_${block.uid}` : block.uid;
    addImport(currentType, uid);
    return "{" + block.uid + ":" + nameType(uid) + "}";
  }

  function addInlineModularBlockField(field: ContentstackTypes.Field) {
    return parenthesis(field.blocks.map((block) => addInlineModularBlock(field, block)).join(" | "));
  }

  function addTypeModularBlockField(field: ContentstackTypes.Field, parentUid?: string) {
    return parenthesis(field.blocks.map((block) => addTypeModularBlock(field, block, parentUid)).join(" | "));
  }

  function addGroupField(field: ContentstackTypes.Field) {
    return ["{", addFields(field.schema), "}"].filter((v) => v).join("\n");
  }

  function addText() {
    return "string";
  }

  function addNumber() {
    return "number";
  }

  function addBoolean() {
    return "boolean";
  }

  function addLink() {
    addImport(currentType, builtins.baseTypes.link, false);
    return `${builtins.baseTypes.link}`; //already has a prefix
  }

  function addFile() {
    addImport(currentType, builtins.baseTypes.file, false);
    return `${builtins.baseTypes.file}`; //already has a prefix
  }

  function addGlobalField(field: ContentstackTypes.GlobalField) {
    if (!field.schema) {
      throw new Error(`Schema not found for global field '${field.uid}. Did you forget to include it?`);
    }

    const name = nameType(field.reference_to);

    return name;
  }

  function addReference(field: ContentstackTypes.Field) {
    const references: string[] = [];

    if (Array.isArray(field.reference_to)) {
      field.reference_to.forEach((v) => {
        references.push(nameType(v));
      });
    }

    return ["(", references.join(" | "), ")", "[]"].join("");
  }

  return function (contentType: ContentstackTypes.ContentType): TsTypesResult {
    currentType = contentType.uid;
    imports = {};
    const name = nameType(contentType.uid);
    if (contentType.schema_type === "global_field") {
      // console.log("Visiting Global Field: ", contentType.uid);
      if (!cachedGlobalFields[name]) {
        cachedGlobalFields[name] = {
          uid: contentType.uid,
          name: name,
          definition: addContentType(contentType),
        };
      }
      // console.log("Imports for Global Field: ", contentType.uid, imports);
      return {
        uid: contentType.uid,
        name: name,
        definition: cachedGlobalFields[name].definition,
        isGlobalField: true,
        imports: imports,
      };
    }
    // console.log("Imports for ContentType: ", contentType.uid, imports);
    return {
      uid: contentType.uid,
      name: name,
      definition: addContentType(contentType),
      metadata: {
        name: nameType(contentType.uid),
        types: {
          javascript: visitedJSTypes,
          contentstack: visitedCSTypes,
          globalFields: visitedGlobalFields,
        },
        dependencies: {
          globalFields: cachedGlobalFields,
          contentTypes: visitedContentTypes,
        },
      },
      imports: imports,
    };
  };
};

export default typesFactory;
