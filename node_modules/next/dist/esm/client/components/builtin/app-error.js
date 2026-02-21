import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { errorStyles, errorThemeCss, ErrorIcon } from './error-styles';
// This is the static 500.html page for App Router apps.
// Always a server error, rendered at build time.
function AppError() {
    return /*#__PURE__*/ _jsxs("html", {
        id: "__next_error__",
        children: [
            /*#__PURE__*/ _jsxs("head", {
                children: [
                    /*#__PURE__*/ _jsx("title", {
                        children: "500: This page failed to load"
                    }),
                    /*#__PURE__*/ _jsx("style", {
                        dangerouslySetInnerHTML: {
                            __html: errorThemeCss
                        }
                    })
                ]
            }),
            /*#__PURE__*/ _jsx("body", {
                children: /*#__PURE__*/ _jsx("div", {
                    style: errorStyles.container,
                    children: /*#__PURE__*/ _jsxs("div", {
                        style: errorStyles.card,
                        children: [
                            /*#__PURE__*/ _jsx(ErrorIcon, {}),
                            /*#__PURE__*/ _jsx("h1", {
                                style: errorStyles.title,
                                children: "This page failed to load"
                            }),
                            /*#__PURE__*/ _jsx("p", {
                                style: errorStyles.message,
                                children: "Something went wrong while loading this page."
                            }),
                            /*#__PURE__*/ _jsx("p", {
                                style: errorStyles.messageHint,
                                children: "If this keeps happening, it may be a server issue."
                            }),
                            /*#__PURE__*/ _jsx("form", {
                                children: /*#__PURE__*/ _jsx("button", {
                                    type: "submit",
                                    style: errorStyles.button,
                                    children: "Reload page"
                                })
                            })
                        ]
                    })
                })
            })
        ]
    });
}
export default AppError;

//# sourceMappingURL=app-error.js.map