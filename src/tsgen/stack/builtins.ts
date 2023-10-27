import { TypeGeneratorOptions } from "../../models/models";
import { defaultOptions } from "../default-options";
import { link } from "fs";
// File and Link fields are additional, non-scalar, data types within a stack.
export interface BuiltInTypesFactoryOutput {
  baseTypes: {
    file: string;
    link: string;
    module: string;
    publishableContent: string;
    content: string;
  };
  // getBaseTypeName: (type: BuiltInType) => string;
  internalTypes: any[];
}

const builtInTypesFactory = (options: TypeGeneratorOptions): BuiltInTypesFactoryOutput => {
  options = { ...defaultOptions, ...options };

  const getBaseTypeName = (type: BuiltInType) => {
    switch (type) {
      case BuiltInType.File:
        return `${options.prefix}${options.baseInterfaceNames.file}`;
      case BuiltInType.Link:
        return `${options.prefix}${options.baseInterfaceNames.link}`;
      case BuiltInType.Module:
        return `${options.prefix}${options.baseInterfaceNames.module}`;
      case BuiltInType.PublishableContent:
        return `${options.prefix}${options.baseInterfaceNames.content}`;
      case BuiltInType.Content:
        return `${options.prefix}${options.baseInterfaceNames.contentBase}`;
      default:
        return `${options.prefix}UnknownType`;
    }
  };
  const getImport = (typeName: string) => {
    if (options.splitFiles) {
      return `import ${typeName} from "./${typeName}"; \n\n`;
    }
    return "";
  };
  const fileTypeName = getBaseTypeName(BuiltInType.File);
  const linkTypeName = getBaseTypeName(BuiltInType.Link);
  const moduleTypeName = getBaseTypeName(BuiltInType.Module);
  const publishableContentTypeName = getBaseTypeName(BuiltInType.PublishableContent);
  const contentTypeName = getBaseTypeName(BuiltInType.Content);
  const internalTypes = [
    {
      uid: fileTypeName.toLowerCase(),
      name: fileTypeName,
      definition: `
      ${getImport(publishableContentTypeName)}
      export ${options.splitFiles ? "default " : ""}interface ${options.prefix}${
        options.baseInterfaceNames.file
      } extends ${publishableContentTypeName}{
          title: string;
          file_size: string;
          filename: string;
          url: string;
          is_dir: boolean;
          parent_uid: string;
      }`,
    },
    {
      //TODO: Check if uid needs to be dynamically set or if it can be hardcoded like this
      uid: linkTypeName.toLowerCase(),
      name: linkTypeName,
      definition: `
      ${getImport(moduleTypeName)}
      export ${options.splitFiles ? "default " : ""}interface ${linkTypeName} extends ${moduleTypeName}{
          title: string;
          href: string;
      }`,
    },
    {
      uid: moduleTypeName.toLowerCase(),
      name: moduleTypeName,
      definition: `export ${options.splitFiles ? "default " : ""}interface ${moduleTypeName}{
          uid: string;
        }`,
    },
    {
      uid: publishableContentTypeName.toLowerCase(),
      name: publishableContentTypeName,
      definition: `
        ${getImport(contentTypeName)}
        export ${
          options.splitFiles ? "default " : ""
        }interface ${publishableContentTypeName} extends ${contentTypeName}{
          locale: string;
          publish_details: {
            environment: string;
            locale: string;
            time: string;
            user: string;
          };
        }`,
    },
    {
      uid: contentTypeName.toLowerCase(),
      name: contentTypeName,
      definition: `
        ${getImport(moduleTypeName)}
        export ${options.splitFiles ? "default " : ""}interface ${contentTypeName} extends ${moduleTypeName}{
          uid: string;
          created_at: string;
          updated_at: string;
          created_by: string;
          updated_by: string;
          content_type: string;
          tags: string[];
          ACL: any[];
          _version: number;
        }`,
    },
  ];

  return {
    baseTypes: {
      file: fileTypeName,
      link: linkTypeName,
      module: moduleTypeName,
      publishableContent: publishableContentTypeName,
      content: contentTypeName,
    },
    internalTypes,
  };
};

export enum BuiltInType {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  File = "file",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Link = "link",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Module = "module",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  PublishableContent = "publishable_content",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Content = "content",
}

export default builtInTypesFactory;
