import { getUniLogger } from "$lib/stores/logger.svelte";
import { WorkerBridge } from "./default";

export class CompilerWorkerBridge extends WorkerBridge<App.Compiler.Request, App.Compiler.Response> {
    constructor(worker: Worker) {
        super(worker);
        super.addObserver({
            onMessage(message) {
                const logger = getUniLogger();
                if (message.type === 'logger') {
                    switch (message.severity) {
                        case 'error':
                            logger.error(message.section, ...message.message);
                            break;
                        case 'warn':
                            logger.warn(message.section, ...message.message);
                            break;
                        case 'info':
                            logger.info(message.section, ...message.message);
                            break;
                    }
                }
            },
        })
    }

    public init(root: string) {
        super.postMessage({ type: 'init', root } as App.Compiler.InitRequest);
    }

    public compile() {
        super.postMessage({ type: 'compile' } as App.Compiler.CompileRequest);
    }

    public definition(file: string, offset: number) {
        super.postMessage({ type: 'definition', file, offset } as App.Compiler.DefinitionRequest);
    }

    public completions(file: string, offset: number) {
        super.postMessage({ type: 'completion', file, offset } as App.Compiler.CompletionRequest);
    }

    public edit(file: string, content: string, offsetStart: number, offsetEnd: number) {
        super.postMessage({ type: 'edit', file, content, offsetStart, offsetEnd } as App.Compiler.EditRequest);
    }

    public move(old_path: string, new_path: string) {
        super.postMessage({ type: 'move', old_path, new_path } as App.Compiler.MoveRequest);
    }

    public add_file(file: string, content: string) {
        super.postMessage({ type: 'add-file', file, content } as App.Compiler.AddFileRequest);
    }

    public set_root(root: string) {
        super.postMessage({ type: 'set-root', root } as App.Compiler.SetRootRequest);
    }

    public print_files() {
        super.postMessage({ type: 'print-files' } as App.Compiler.PrintFilesRequest);
    }

    public ast_tree(path: string) {
        super.postMessage({ type: 'ast-tree', path } as App.Compiler.TreeRequest);
    }

    public onMessage(callback: (message: App.Compiler.Response) => void): void {
        super.onMessageRaw(callback);
    }
}