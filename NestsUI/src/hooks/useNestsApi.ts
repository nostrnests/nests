import { useMemo } from "react";
import { NestsApi } from "../api";
import { ApiUrl } from "../const";
import { useLogin } from "../login";

export function useNestsApi() {
  const { signer } = useLogin();
  return useMemo(() => new NestsApi(ApiUrl, signer), [signer]);
}
