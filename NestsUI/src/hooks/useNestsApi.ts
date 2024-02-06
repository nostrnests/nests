import { NestsApi } from "../api";
import { ApiUrl } from "../const";
import { useLogin } from "../login";

export function useNestsApi() {
  const { signer } = useLogin();
  if (!signer) return;
  return new NestsApi(ApiUrl, signer);
}
