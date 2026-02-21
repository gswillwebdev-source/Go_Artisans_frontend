'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, // Exported so that the import signature in the loaders can be identical to user
// supplied custom global error signatures.
"default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _jsxruntime = require("react/jsx-runtime");
const _handleisrerror = require("../handle-isr-error");
const _errorstyles = require("./error-styles");
function DefaultGlobalError({ error }) {
    const digest = error?.digest;
    const isServerError = !!digest;
    // Server error: "This page failed to load"
    // Client error: "This page crashed"
    const title = isServerError ? 'This page failed to load' : 'This page crashed';
    const message = isServerError ? 'Something went wrong while loading this page.' : 'An error occurred while running this page.';
    const hint = isServerError ? 'If this keeps happening, it may be a server issue.' : null;
    return /*#__PURE__*/ (0, _jsxruntime.jsxs)("html", {
        id: "__next_error__",
        children: [
            /*#__PURE__*/ (0, _jsxruntime.jsx)("head", {
                children: /*#__PURE__*/ (0, _jsxruntime.jsx)("style", {
                    dangerouslySetInnerHTML: {
                        __html: _errorstyles.errorThemeCss
                    }
                })
            }),
            /*#__PURE__*/ (0, _jsxruntime.jsxs)("body", {
                children: [
                    /*#__PURE__*/ (0, _jsxruntime.jsx)(_handleisrerror.HandleISRError, {
                        error: error
                    }),
                    /*#__PURE__*/ (0, _jsxruntime.jsx)("div", {
                        style: _errorstyles.errorStyles.container,
                        children: /*#__PURE__*/ (0, _jsxruntime.jsxs)("div", {
                            style: _errorstyles.errorStyles.card,
                            children: [
                                /*#__PURE__*/ (0, _jsxruntime.jsx)(_errorstyles.ErrorIcon, {}),
                                /*#__PURE__*/ (0, _jsxruntime.jsx)("h1", {
                                    style: _errorstyles.errorStyles.title,
                                    children: title
                                }),
                                /*#__PURE__*/ (0, _jsxruntime.jsx)("p", {
                                    style: _errorstyles.errorStyles.message,
                                    children: message
                                }),
                                hint && /*#__PURE__*/ (0, _jsxruntime.jsx)("p", {
                                    style: _errorstyles.errorStyles.messageHint,
                                    children: hint
                                }),
                                !isServerError && /*#__PURE__*/ (0, _jsxruntime.jsx)("p", {
                                    style: _errorstyles.errorStyles.messageHint,
                                    children: "Reloading usually fixes this."
                                }),
                                /*#__PURE__*/ (0, _jsxruntime.jsxs)("div", {
                                    style: _errorstyles.errorStyles.buttonGroup,
                                    children: [
                                        /*#__PURE__*/ (0, _jsxruntime.jsx)("form", {
                                            children: /*#__PURE__*/ (0, _jsxruntime.jsx)("button", {
                                                type: "submit",
                                                style: _errorstyles.errorStyles.button,
                                                children: "Reload page"
                                            })
                                        }),
                                        !isServerError && /*#__PURE__*/ (0, _jsxruntime.jsx)("button", {
                                            type: "button",
                                            style: _errorstyles.errorStyles.buttonSecondary,
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
                                digest && /*#__PURE__*/ (0, _jsxruntime.jsx)("div", {
                                    style: _errorstyles.errorStyles.digestContainer,
                                    children: /*#__PURE__*/ (0, _jsxruntime.jsxs)("p", {
                                        style: _errorstyles.errorStyles.digest,
                                        children: [
                                            "Error reference:",
                                            ' ',
                                            /*#__PURE__*/ (0, _jsxruntime.jsx)("code", {
                                                style: _errorstyles.errorStyles.digestCode,
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
const _default = DefaultGlobalError;

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  Object.assign(exports.default, exports);
  module.exports = exports.default;
}

//# sourceMappingURL=global-error.js.map