import * as fs from "fs";

import { ExtensionConfig } from "./models/models";
import TypeScriptCodeGeneratorCommand from "./tsgen/command/generate";
import { defaultOptions } from "./tsgen/default-options";

let config: ExtensionConfig = {
  ...defaultOptions,
  apiKey: "your_api_key",
  token: "your_cm_token",
  baseUrl: "https://api.contentstack.io",
  saveTo: "",
  includeDocumentation: false,
  prefix: "Contentstack",
  inlineModularBlocks: false,
  verboseModularBlocks: true,
  splitFiles: true,
  baseInterfaceNames: {
    module: "Module",
    contentBase: "ContentBase",
    content: "Content",
    file: "File",
    link: "Link",
  },
};

// console.log("Configuration", config);

const command = new TypeScriptCodeGeneratorCommand(config);
command.generate().then((response) => {
  console.log("Response", response.files?.length);
  if (config.splitFiles) {
    response.files?.forEach((file) => {
      fs.writeFileSync(
        `/Users/jaimesantosalcon/dev/vs-extensions/contentstack-types-generator/src/contentstack/${file.name}.ts`,
        file.definition
      );
    });
  } else {
    fs.writeFileSync(
      `/Users/jaimesantosalcon/dev/vs-extensions/contentstack-types-generator/src/contentstack/auto.ts`,
      response.output
    );
  }

  console.log("Done!");
});
