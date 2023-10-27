import * as ContentstackTypes from "./contentstack-schema";

import { DocumentationGenerator } from "../tsgen/docgen/doc";

export enum ContentTypeVariation {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ModularBlock = "modular_block",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  GlobalField = "global_field",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ContentType = "content_type",
}
export interface TypeDefinition {
  uid: string;
  name: string;
  definition: string;
  fieldType?: ContentTypeVariation;
  imports?: Imports;
}
export interface TypesGeneratorResult {
  definitions: number;
  files?: TypeDefinition[];
  output: string;
}
export interface CommandOutput extends TypesGeneratorResult {
  error: boolean;
  message?: string;
}

export type GlobalFieldCache = {
  [prop: string]: { uid: string; name: string; definition: string };
};

export enum TypeFlags {
  builtinJS = 1 << 0,
  builtinCS = 1 << 1,
  userGlobalField = 1 << 2,
  userBlock = 1 << 3,
  userGroup = 1 << 4,
  userReference = 1 << 5,
}

export type TypeMapMatch = {
  func: (field: ContentstackTypes.Field, parentUid?: string) => string;
  track: boolean;
  flag: TypeFlags;
};

export type TypeMap = {
  [prop: string]: TypeMapMatch;
};

export interface TypeGeneratorOptions {
  prefix: string;
  inlineModularBlocks: boolean;
  verboseModularBlocks: boolean;
  splitFiles: boolean;
  includeDocumentation: boolean;
  baseInterfaceNames: {
    module: string;
    contentBase: string;
    content: string;
    file: string;
    link: string;
  };
}

export type TsTypesResult = {
  uid: string;
  name: string;
  definition: string;
  isGlobalField?: boolean;
  imports: Imports;
  metadata?: {
    name: string;
    types: {
      javascript: Set<string>;
      contentstack: Set<string>;
      globalFields: Set<string>;
    };
    dependencies: {
      globalFields: GlobalFieldCache;
      contentTypes: Set<string>;
    };
  };
};

export interface StackConnectionConfig {
  apiKey: string;
  token: string;
  baseUrl: string;
}

export interface Imports {
  [prop: string]: string[];
}

export type ExtensionConfig = TypeGeneratorOptions & StackConnectionConfig & { saveTo: string };
