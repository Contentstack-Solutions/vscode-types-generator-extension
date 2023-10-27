import { assert, expect } from "chai";

import { ExtensionConfig } from "../../models/models";
import TypeScriptCodeGeneratorCommand from "../../tsgen/command/generate";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it

// import * as myExtension from '../../extension';

const apiKey = "";
const baseUrl = "https://api.contentstack.io";
const token = "";
const saveTo = "";

const getConfig = (partial?: Partial<ExtensionConfig>) => {
  return {
    apiKey,
    baseUrl,
    token,
    saveTo,
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
    ...partial,
  };
};

suite("Extension Test Suite", () => {
  test("Split Files Generation", async () => {
    let config = getConfig();
    assert.isTrue(config.splitFiles, "Split files should be true");
    const command = new TypeScriptCodeGeneratorCommand(config);
    const result = await command.generate();
    assert.isFalse(result.error, "Error should be false");
    assert.isNotNull(result, "Result should not be null");
    assert.isNotNull(result.files, "Files should not be null");
    if (result.files) {
      assert.isAbove(result.files?.length, 0, "Files should be greater than 0");
    }
  });
  test("Inline Generation", async () => {
    let config = getConfig({ splitFiles: false });
    assert.isFalse(config.splitFiles, "Split files should be false");
    const command = new TypeScriptCodeGeneratorCommand(config);
    const result = await command.generate();
    assert.isFalse(result.error, "Error should be false");
    assert.isNotNull(result, "Result should not be null");
    assert.isNotNull(result.files, "Files should not be null");
    if (result.files) {
      assert.equal(result.files?.length, 0, "Files should be  0");
    }
  });
});
