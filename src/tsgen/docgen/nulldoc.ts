import { DocumentationGenerator } from "./doc";

export default class NullDocumentationGenerator implements DocumentationGenerator {
  interface(description: string) {
    return null;
  }

  field(description: string) {
    return null;
  }
}
