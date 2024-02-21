import { ReactNode, useEffect, useState } from "react";
import { IntlProvider } from "react-intl";
import { useLogin } from "./login";

import en from "./translations/en_US.json";

const DefaultLocale = "en-US";

export default function IntlContext({ children }: { children?: ReactNode }) {
  const login = useLogin();
  const [tx, setTx] = useState<Record<string, string>>();

  const load = async (locale?: string) => {
    locale ??= navigator.language;

    const toRecordLang = (data: Record<string, { defaultMessage: string }>) => {
      return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.defaultMessage]));
    };
    const loadInner = async (lx: string) => {
      const ar = (await import(`./translations/${lx}.json`)).default;
      return toRecordLang(ar);
    };

    switch (locale) {
      case "ar":
      case "ar-SA": {
        return await loadInner("ar_SA");
      }
      case "de":
      case "de-DE": {
        return await loadInner("de_DE");
      }
      case "es":
      case "es-ES": {
        return await loadInner("es_ES");
      }
      case "fi":
      case "fi-FI": {
        return await loadInner("fi_FI");
      }
      case "fr":
      case "fr-FR": {
        return await loadInner("fr_FR");
      }
      case "ja":
      case "ja-JP": {
        return await loadInner("ja_JP");
      }
      case "pt-BR": {
        return await loadInner("pt_BR");
      }
      case "pt":
      case "pt-PT": {
        return await loadInner("pt_PT");
      }
      case "ru":
      case "ru-RU": {
        return await loadInner("ru_RU");
      }
      case "sv":
      case "sv-SE": {
        return await loadInner("sv_SE");
      }
      case "th":
      case "th-TH": {
        return await loadInner("th_TH");
      }
      case "zh":
      case "zh-Hans-CN":
      case "zh-CN": {
        return await loadInner("zh_CN");
      }
      case "zh-TW": {
        return await loadInner("zh_TW");
      }
    }
  };

  useEffect(() => {
    load(login.locale).then(setTx);
  }, [login.locale]);

  return (
    <IntlProvider messages={tx ?? en} locale={login.locale ?? DefaultLocale} defaultLocale={DefaultLocale}>
      {children}
    </IntlProvider>
  );
}
