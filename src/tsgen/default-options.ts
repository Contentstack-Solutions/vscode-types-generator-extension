import { TypeGeneratorOptions } from "../models/models";

export const defaultOptions: TypeGeneratorOptions = {
  prefix: "",
  inlineModularBlocks: false,
  verboseModularBlocks: true,
  splitFiles: true,
  includeDocumentation: true,
  baseInterfaceNames: {
    module: "Module",
    contentBase: "ContentBase",
    content: "Content",
    file: "File",
    link: "Link",
  },
};
