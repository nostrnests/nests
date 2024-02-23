import { useMemo } from "react";
import { NestsApi } from "../api";
import { ApiUrl } from "../const";
import { useLogin } from "../login";

export function useNestsApi(api?: string) {
  const { signer } = useLogin();
  return useMemo(() => new NestsApi(api ?? ApiUrl, signer), [api, signer]);
}
