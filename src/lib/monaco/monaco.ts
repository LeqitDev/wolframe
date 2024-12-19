import * as monaco from 'monaco-editor';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

self.MonacoEnvironment = {
    getWorker(_workerId, label) {
        if (label === 'json') {
            return new jsonWorker();
        }
        return new editorWorker();
    },
};

export default monaco;