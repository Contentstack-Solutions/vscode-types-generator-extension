import * as prettier from "prettier";

import { TypeDefinition, TypeGeneratorOptions, TypesGeneratorResult } from "../models/models";
import builtInTypesFactory, { BuiltInTypesFactoryOutput } from "./stack/builtins";

import { ContentType } from "../models/contentstack-schema";
import tsTypesFactory from "./types-factory";

async function format(definition: string) {
  // console.log("Formatting ::", definition);
  const prettierConfig = await prettier.resolveConfig(process.cwd());
  const formatted = await prettier.format(definition, {
    ...prettierConfig,
    parser: "typescript",
  });
  return formatted;
}

export default async function typesCreator(
  contentTypes: ContentType[],
  options: TypeGeneratorOptions
): Promise<TypesGeneratorResult> {
  //TODO: Implement better documentation generator, from the Content Type's details
  const globalFieldTypes = new Set<TypeDefinition>();
  const contentTypeTypes: TypeDefinition[] = [];
  const builtins: BuiltInTypesFactoryOutput = builtInTypesFactory(options);

  const tsTypes = tsTypesFactory({
    prefix: options.prefix,
    verboseModularBlocks: options.verboseModularBlocks,
    inlineModularBlocks: options.inlineModularBlocks,
    splitFiles: options.splitFiles,
    includeDocumentation: options.includeDocumentation,
    baseInterfaceNames: options.baseInterfaceNames,
  });

  for (const contentType of contentTypes) {
    const tsTypesResult = tsTypes(contentType);

    // console.log("Processing Type: ", tsTypesResult.name, tsTypesResult.imports);
    if (tsTypesResult.isGlobalField) {
      globalFieldTypes.add(tsTypesResult);
    } else {
      contentTypeTypes.push(tsTypesResult);

      tsTypesResult?.metadata?.types.globalFields.forEach((field: string) => {
        if (tsTypesResult.metadata) {
          globalFieldTypes.add(tsTypesResult.metadata.dependencies.globalFields[field]);
        }
      });
    }
  }
  let output = "";
  let files: TypeDefinition[] = [];

  const allTypes: TypeDefinition[] = [...builtins.internalTypes, ...[...globalFieldTypes], ...contentTypeTypes];
  if (options.splitFiles) {
    allTypes.forEach(async (typeDefinition) => {
      let text = "";
      if (typeDefinition.imports && Object.keys(typeDefinition.imports).length > 0) {
        text += Object.values(typeDefinition.imports[typeDefinition.uid]).join("\n");
      }
      if (text !== "") {
        text += "\n\n";
      }
      text += typeDefinition.definition;
      files.push({
        uid: typeDefinition.uid,
        name: typeDefinition.name,
        definition: await format(text),
      });
    });
  }
  output = await format(
    [
      builtins.internalTypes.map((td) => td.definition).join("\n\n"),
      [...globalFieldTypes].map((td) => td.definition).join("\n\n"),
      contentTypeTypes.map((td) => td.definition).join("\n\n"),
    ].join("\n\n")
  );

  return Promise.resolve({
    definitions: allTypes.length,
    output,
    files,
  });
}
