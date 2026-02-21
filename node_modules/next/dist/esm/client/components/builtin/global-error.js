'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HandleISRError } from '../handle-isr-error';
import { errorStyles, errorThemeCss, ErrorIcon } from './error-styles';
function DefaultGlobalError({ error }) {
    const digest = error?.digest;
    const isServerError = !!digest;
    // Server error: "This page failed to load"
    // Client error: "This page crashed"
    const title = isServerError ? 'This page failed to load' : 'This page crashed';
    const message = isServerError ? 'Something went wrong while loading this page.' : 'An error occurred while running this page.';
    const hint = isServerError ? 'If this keeps happening, it may be a server issue.' : null;
    return /*#__PURE__*/ _jsxs("html", {
        id: "__next_error__",
        children: [
            /*#__PURE__*/ _jsx("head", {
                children: /*#__PURE__*/ _jsx("style", {
                    dangerouslySetInnerHTML: {
                        __html: errorThemeCss
                    }
                })
            }),
            /*#__PURE__*/ _jsxs("body", {
                children: [
                    /*#__PURE__*/ _jsx(HandleISRError, {
                        error: error
                    }),
                    /*#__PURE__*/ _jsx("div", {
                        style: errorStyles.container,
                        children: /*#__PURE__*/ _jsxs("div", {
                            style: errorStyles.card,
                            children: [
                                /*#__PURE__*/ _jsx(ErrorIcon, {}),
                                /*#__PURE__*/ _jsx("h1", {
                                    style: errorStyles.title,
                                    children: title
                                }),
                                /*#__PURE__*/ _jsx("p", {
                                    style: errorStyles.message,
                                    children: message
                                }),
                                hint && /*#__PURE__*/ _jsx("p", {
                                    style: errorStyles.messageHint,
                                    children: hint
                                }),
                                !isServerError && /*#__PURE__*/ _jsx("p", {
                                    style: errorStyles.messageHint,
                                    children: "Reloading usually fixes this."
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    style: errorStyles.buttonGroup,
                                    children: [
                                        /*#__PURE__*/ _jsx("form", {
                                            children: /*#__PURE__*/ _jsx("button", {
                                                type: "submit",
                                                style: errorStyles.button,
                                                children: "Reload page"
                                            })
                                        }),
                                        !isServerError && /*#__PURE__*/ _jsx("button", {
                                            type: "button",
                                            style: errorStyles.buttonSecondary,
                                            onClick: ()=>{
                                                if (window.history.length > 1) {
                                                    window.history.back();
                                                } else {
                                                    window.location.href = '/';
                                                }
                                            },
                                            children: "Go back"
                                        })
                                    ]
                                }),
                                digest && /*#__PURE__*/ _jsx("div", {
                                    style: errorStyles.digestContainer,
                                    children: /*#__PURE__*/ _jsxs("p", {
                                        style: errorStyles.digest,
                                        children: [
                                            "Error reference:",
                                            ' ',
                                            /*#__PURE__*/ _jsx("code", {
                                                style: errorStyles.digestCode,
                                                children: digest
                                            })
                                        ]
                                    })
                                })
                            ]
                        })
                    })
                ]
            })
        ]
    });
}
// Exported so that the import signature in the loaders can be identical to user
// supplied custom global error signatures.
export default DefaultGlobalError;

//# sourceMappingURL=global-error.js.map