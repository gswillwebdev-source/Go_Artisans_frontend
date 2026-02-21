export declare const errorStyles: {
    readonly container: {
        readonly fontFamily: "system-ui,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\"";
        readonly height: "100vh";
        readonly display: "flex";
        readonly alignItems: "center";
        readonly justifyContent: "center";
    };
    readonly card: {
        readonly maxWidth: "420px";
        readonly padding: "32px 28px";
        readonly textAlign: "left";
    };
    readonly icon: {
        readonly marginBottom: "16px";
    };
    readonly title: {
        readonly fontSize: "17px";
        readonly fontWeight: 600;
        readonly letterSpacing: "-0.01em";
        readonly margin: "0 0 8px 0";
        readonly color: "var(--next-error-title)";
    };
    readonly message: {
        readonly fontSize: "14px";
        readonly fontWeight: 400;
        readonly lineHeight: 1.6;
        readonly margin: "0 0 6px 0";
        readonly color: "var(--next-error-message)";
    };
    readonly messageHint: {
        readonly fontSize: "13px";
        readonly fontWeight: 400;
        readonly lineHeight: 1.5;
        readonly margin: "0 0 20px 0";
        readonly color: "var(--next-error-hint)";
    };
    readonly buttonGroup: {
        readonly display: "flex";
        readonly gap: "12px";
        readonly alignItems: "center";
    };
    readonly button: {
        readonly padding: "10px 20px";
        readonly fontSize: "14px";
        readonly fontWeight: 500;
        readonly letterSpacing: "0.01em";
        readonly borderRadius: "6px";
        readonly cursor: "pointer";
        readonly color: "var(--next-error-btn-text)";
        readonly background: "var(--next-error-btn-bg)";
        readonly border: "var(--next-error-btn-border)";
    };
    readonly buttonSecondary: {
        readonly padding: "10px 20px";
        readonly fontSize: "14px";
        readonly fontWeight: 500;
        readonly letterSpacing: "0.01em";
        readonly borderRadius: "6px";
        readonly cursor: "pointer";
        readonly color: "var(--next-error-btn-secondary-text)";
        readonly background: "transparent";
        readonly border: "none";
    };
    readonly digestContainer: {
        readonly marginTop: "20px";
        readonly paddingTop: "16px";
        readonly borderTop: "var(--next-error-digest-border)";
    };
    readonly digest: {
        readonly fontSize: "12px";
        readonly fontWeight: 400;
        readonly margin: "0";
        readonly color: "var(--next-error-digest)";
    };
    readonly digestCode: {
        readonly fontFamily: "ui-monospace,SFMono-Regular,\"SF Mono\",Menlo,Consolas,monospace";
        readonly fontSize: "11px";
        readonly color: "var(--next-error-digest-code)";
        readonly userSelect: "all";
    };
};
export declare const errorThemeCss: string;
export declare function ErrorIcon(): import("react/jsx-runtime").JSX.Element;
