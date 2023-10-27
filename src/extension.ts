import * as fs from "fs"; // In NodeJS: 'const fs = require('fs')'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { ExtensionConfig } from "./models/models";
import TypeScriptCodeGeneratorCommand from "./tsgen/command/generate";

async function openInUntitled(content: string, language?: string) {
  const document = await vscode.workspace.openTextDocument({
    language,
    content,
  });
  vscode.window.showTextDocument(document);
}

async function openFile(path: string) {
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
  vscode.window.showTextDocument(document);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "contentstack-types-generator" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("contentstack-types-generator.generateTypes", async () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    // 	vscode.window.showInformationMessage("Hello Contentstack Types Generator!");
    // const vsConfig = vscode.workspace.getConfiguration("contentstack-types-generator");
    if (vscode.workspace.workspaceFolders === undefined) {
      vscode.window.showErrorMessage("Contentstack: Working folder not found, open a folder an try again");
      return;
    }
    // let wf = vscode.workspace.workspaceFolders[0].uri.path;
    let f = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let config: ExtensionConfig = {} as ExtensionConfig;

    const path = `${f}/csconfig.json`;
    if (!fs.existsSync(path)) {
      config = {
        apiKey: vscode.workspace.getConfiguration("contentstack.typesGenerator").get("apiKey") || "",
        token: vscode.workspace.getConfiguration("contentstack.typesGenerator").get("token") || "",
        baseUrl: vscode.workspace.getConfiguration("contentstack.typesGenerator").get("baseUrl") || "",
        prefix: vscode.workspace.getConfiguration("contentstack.typesGenerator").get("prefix") || "",
        includeDocumentation:
          vscode.workspace.getConfiguration("contentstack.typesGenerator").get("generateDocs") || false,
        saveTo: vscode.workspace.getConfiguration("contentstack.typesGenerator").get("saveTo") || "",
        splitFiles: vscode.workspace.getConfiguration("contentstack.typesGenerator").get("splitFiles"),
        verboseModularBlocks: vscode.workspace
          .getConfiguration("contentstack.typesGenerator")
          .get("verboseModularBlocks"),
        inlineModularBlocks: vscode.workspace
          .getConfiguration("contentstack.typesGenerator")
          .get("inlineModularBlocks"),
        baseInterfaceNames: {
          module: vscode.workspace.getConfiguration("contentstack.typesGenerator").get("baseTypeName"),
          contentBase: vscode.workspace.getConfiguration("contentstack.typesGenerator").get("baseContentTypeName"),
          content: vscode.workspace
            .getConfiguration("contentstack.typesGenerator")
            .get("basePublishableContentTypeName"),
          file: vscode.workspace.getConfiguration("contentstack.typesGenerator").get("fileTypeName"),
          link: vscode.workspace.getConfiguration("contentstack.typesGenerator").get("linkTypeName"),
        },
      } as ExtensionConfig;
    } else {
      const configFile = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
      config = JSON.parse(configFile.getText());
    }

    if (config.apiKey === "" || config.token === "" || config.baseUrl === "") {
      vscode.window.showErrorMessage(
        "Contentstack: Config not found, make sure you provided the required configuration either via the settings section or with a 'csconfig.json' file"
      );
      return;
    }
    if (config.splitFiles && config.saveTo) {
      if (config.saveTo === "") {
        vscode.window.showErrorMessage(
          "Contentstack: Configuration set to split files. Provide a directory to save those files in."
        );
        return;
      }
      if (!fs.existsSync(config.saveTo) || !fs.lstatSync(config.saveTo).isDirectory()) {
        vscode.window.showErrorMessage(
          "Contentstack: Configuration set to split files. Save To must be an existing directory."
        );
        return;
      }
    }

    const command = new TypeScriptCodeGeneratorCommand(config);
    const response = await command.generate();

    if (response.error) {
      vscode.window.showErrorMessage(`Contentstack: ${response.message}`);
      return;
    }

    // vscode.workspace.fs.writeFile(vscode.Uri.file(response.outputFile!), Buffer.from(response.output!));
    // console.log("Response", response);
    if (config.splitFiles) {
      response.files?.forEach((file) => {
        // console.log(`>>> ${config.saveTo}/${file.name}.ts`);
        vscode.workspace.fs.writeFile(
          vscode.Uri.file(`${config.saveTo}/${file.name}.ts`),
          Buffer.from(file.definition)
        );
      });
    } else {
      if (config.saveTo) {
        const path = `${config.saveTo}/contentstack-auto-generated.ts`;
        vscode.workspace.fs.writeFile(vscode.Uri.file(path), Buffer.from(response.output));
        openFile(path);
      } else {
        openInUntitled(response.output!, "typescript");
      }
    }
    vscode.window.showInformationMessage(`Contentstack: ${response.message}`!);
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
