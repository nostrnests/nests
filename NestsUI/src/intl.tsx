import { ReactNode } from "react";
import { IntlProvider } from "react-intl";
import { useLogin } from "./login";

import en from "./translations/en_US.json";

export default function IntlContext({ children }: { children?: ReactNode }) {
  const login = useLogin();
  return (
    <IntlProvider messages={en} locale={login.locale} defaultLocale="en-US">
      {children}
    </IntlProvider>
  );
}
