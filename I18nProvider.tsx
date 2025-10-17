// I18nProvider.tsx
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { createI18n, dictionaries, Lang } from './i18n';

type I18nCtx = {
    lang: Lang;
    setLang: (l: Lang) => void;
    t: (key: string, params?: Record<string, any>) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

export const I18nProvider: React.FC<{ initial?: Lang; children: React.ReactNode }> = ({ initial = 'vi', children }) => {
    const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || initial);

    useEffect(() => {
        localStorage.setItem('lang', lang);
        // Optional: cập nhật lang cho <html lang="...">
        document.documentElement.lang = lang;
    }, [lang]);

    const api = useMemo(() => {
        const i = createI18n(lang);
        return { lang, setLang: (l: Lang) => setLang(l), t: i.t.bind(i) };
    }, [lang]);

    return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export function useI18n() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
}
