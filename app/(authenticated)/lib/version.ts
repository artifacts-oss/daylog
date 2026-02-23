import packageJson from '../../../package.json';

export default function getVersion() {
  return packageJson.version;
}
