import { createOnigScanner, createOnigString } from 'vscode-oniguruma';
import wasmURL from 'vscode-oniguruma/release/onig.wasm?url';
import type { TextMateGrammar } from './provider';

export async function loadVSCodeOnigurumWASM(): Promise<Response | ArrayBuffer> {
    const response = await fetch(wasmURL);
    const contentType = response.headers.get('Content-Type');
    if (contentType == 'application/wasm') {
        return response;
    }

    return await response.arrayBuffer();
}


export const resolveOnigLib = Promise.resolve({
        createOnigScanner,
        createOnigString,
    })

export const loadTypstGrammar = async (): Promise<TextMateGrammar> => {
    const response = await fetch(
        'https://raw.githubusercontent.com/michidk/typst-grammar/refs/heads/main/grammars/typst.tmLanguage.json'
    );
    const grammar = await response.text();
    return {type: 'json', grammar};
}