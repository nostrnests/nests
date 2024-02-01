import { Nip7Signer } from "@snort/system";
import { NestsApi } from "../api";
import { ApiUrl } from "../const";

export function useNestsApi() {
  return new NestsApi(ApiUrl, new Nip7Signer());
}
