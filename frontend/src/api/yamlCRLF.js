import { stringify } from "yaml";

export default function YamlCRLF(obj) {
  return stringify(obj).replace(/(?<!\r)\n/g, "\r\n")
}
