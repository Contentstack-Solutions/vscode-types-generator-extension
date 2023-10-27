/* eslint-disable @typescript-eslint/naming-convention */
import { CommandOutput, ExtensionConfig, TypesGeneratorResult } from "../../models/models";
import { getContentTypes, getGlobalFields } from "../stack/contentstack-cm";

import { ContentType } from "../../models/contentstack-schema";
import typesCreator from "../types-creator";

const getModularBlocks = (contentType: ContentType, existingBlocks: ContentType[], verboseModularBlocks: boolean) => {
  let blocks = existingBlocks || [];
  if (blocks.some((b) => b.uid === contentType.uid)) {
    return [];
  }
  if (contentType.schema && contentType.schema.length > 0) {
    contentType.schema
      .filter((f) => f.data_type === "blocks")
      .forEach((field) => {
        if (field.blocks && field.blocks.length > 0) {
          field.blocks.forEach((block) => {
            // console.log("Block: ", block.uid);
            const bct: ContentType = {
              description: block.title,
              schema: block.schema,
              _version: 0,
              uid: verboseModularBlocks ? `${contentType.uid}_${field.uid}_${block.uid}` : block.uid,
              schema_type: "modular_block",
            };

            blocks.push(bct);
            blocks.push(...getModularBlocks(bct, blocks, verboseModularBlocks));
          });
        }
      });
  }

  return blocks;
};

export default class TypeScriptCodeGeneratorCommand {
  static description = "Generates TypeScript typings from a Stack";
  config: ExtensionConfig = {} as ExtensionConfig;

  constructor(config: ExtensionConfig) {
    this.config = config;
  }

  async generate(): Promise<CommandOutput> {
    try {
      const types = await getContentTypes(this.config);
      const globalFields = await getGlobalFields(this.config);

      let schemas: ContentType[] = [];
      let modularBlocks: ContentType[] = [];

      if (types?.length) {
        if ((globalFields as any)?.length) {
          schemas = schemas.concat(globalFields);
          schemas = schemas.map((schema) => ({
            ...schema,
            schema_type: "global_field",
          }));
        }
        if (types && types.length > 0) {
          schemas = schemas.concat(types);
          if (!this.config.inlineModularBlocks) {
            types.forEach((t: any) => {
              modularBlocks = modularBlocks.concat(...getModularBlocks(t, [], this.config.verboseModularBlocks));
            });
          }
        }

        if (modularBlocks && modularBlocks.length > 0) {
          schemas = schemas.concat(modularBlocks);
        }
        // console.log("Imports: ", imports);
        const result = await typesCreator(schemas, { ...this.config });

        return getSuccessResponse(`Contentstack :: Generated ${result.definitions} definitions.`, result);
      } else {
        return getErrorResponse("No Content Types exist in the Stack.");
      }
    } catch (error) {
      return getErrorResponse("Error generating TypeScript definitions.", error);
    }
  }
}
const getSuccessResponse = (msg: string, result?: TypesGeneratorResult): CommandOutput => {
  return {
    error: false,
    message: msg,
    definitions: result?.definitions || 0,
    output: result?.output || "",
    files: result?.files || [],
  };
};
const getErrorResponse = (msg: string, error?: any): Promise<CommandOutput> => {
  return Promise.resolve({
    error: true,
    message: `${msg} ${error}`,
    definitions: 0,
    output: "",
    files: [],
  });
};
