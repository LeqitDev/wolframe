import { MainWSFlowerSection } from "$lib/stores/logger.svelte";
import type { ProjectAppState } from "$lib/stores/project.svelte";

export class FlowerServer {
	ws: WebSocket | null = null;
	client_id: string;
    project_state: ProjectAppState;
    project_id: string;
    revisionNumbers = new Map<string, number>();
    lastLengths = new Map<string, string>();
	editQueue: Array<() => void> = [];
	isWaitingForEditOk = false;
	disposed = false;
    on_init_ok: (msg: Flower.ServerResponse) => void = () => {};
	on_open_ok: (msg: Flower.ServerResponse) => void = () => {};

	constructor(project_id: string, client_id: string, project_state: ProjectAppState) {
		this.client_id = client_id;
        this.project_state = project_state;
        this.project_id = project_id;

        this.tryConnect();
	}

    tryConnect() {
        const url = 'ws://localhost:3030/users/' + this.project_id;
        this.project_state.logger.info(MainWSFlowerSection, 'Connecting to', url);
        const flowerServer = new WebSocket(url);

        flowerServer.onopen = () => {
			if (this.project_state.loading) {
				this.project_state.loading = false;
			}
            this.project_state.flowerState.reconnectingAttempts = 0;
            this.ws = flowerServer;
			// flowerServer.send('INIT ' + data.project?.id);
			this.init();
			this.project_state.loadMessage = 'Painting the canvas like picasso';
			this.project_state.flowerState.connected = true;
			this.project_state.flowerState.status = 'connected';
		};

		flowerServer.onerror = (e) => {
			this.project_state.logger.error(MainWSFlowerSection, 'Websocket Error', e);
			flowerServer.close();
		};

		flowerServer.onclose = () => {
			this.project_state.flowerState.connected = false;
			if (!this.disposed) this.scheduleReconnect();
		};

		flowerServer.onmessage = (e: MessageEvent<string>) => {
            this.onMessage(JSON.parse(e.data));
			/* if (e.data.startsWith('INIT ')) {
				this.project_state.vfs.get('main.typ')?.model.setValue(e.data.slice(5));
				try {
					compiler?.add_file('main.typ', e.data.slice(5));
					render();
					canvasContainer.style.gap = `${previewScale * convertRemToPixels(5)}px`;
					canvasContainer.style.padding = `${previewScale * convertRemToPixels(4)}px`;
				} catch (e) {
					console.error(e);
				}

				setTimeout(() => {
					// add delay to prevent an echo
					this.project_state.vfs.get('main.typ')?.model.onDidChangeContent((e: any) => {
						onContentChanged(e);
					});
				}, 50);
			} */
		};
    }

    scheduleReconnect() {
		this.project_state.flowerState.reconnectingAttempts++;
		if (this.project_state.flowerState.reconnectingAttempts < this.project_state.flowerState.maxReconnectAttempts) {
			this.project_state.flowerState.status = 'reconnecting';
			this.project_state.flowerState.curTimeout = setTimeout(() => {
				this.tryConnect();
			}, 2000 * this.project_state.flowerState.reconnectingAttempts);
		} else {
			this.project_state.flowerState.status = 'failed';
		}
	}

    send(msg: string) {
        this.ws?.send(msg);
    }

    close() {
		this.disposed = true;
        this.ws?.close();
    }

	init() {
		this.rawSend({
			clientId: this.client_id,
			revision: { type: 'None' },
			parentRevision: 0,
			timestamp: Date.now(),
			action: { type: 'Init', projectId: '' }
		});
	}

	private applyEdit(prev: string, change: { text: string, rangeOffset: number, rangeLength: number}): string {
		const start = prev.slice(0, change.rangeOffset);
		const end = prev.slice(change.rangeOffset + change.rangeLength, prev.length);
		return start + change.text + end;
	}

    editFile(path: string, changes: { text: string, rangeOffset: number, rangeLength: number }[]) {
		let lastText = this.lastLengths.get(path) ?? "";
        for (const change of changes) {
			const rangeOffset = this.unicodeLength(lastText.slice(0, change.rangeOffset));
			const rangeLength = this.unicodeLength(lastText.slice(change.rangeOffset, change.rangeOffset + change.rangeLength));
			const fullLength = this.unicodeLength(lastText);
			const restLength = fullLength - (rangeOffset + rangeLength);
			console.log('rangeOffset', rangeOffset, 'rangeLength', rangeLength, 'fullLength', fullLength, lastText.length, restLength, change);
			this.editQueue.push(() => {
				this.rawEditFile(path, {
					text: change.text,
					rangeOffset,
					rangeLength,
					restLength
				});
			});
			lastText = this.applyEdit(lastText, change);
			console.log('lastText', lastText);
        }

		this.processNextEdit();

		const split = path.split('/files/');
		split.shift();
		const relative_path = split.join('/files/');
		const fullText = this.project_state.vfs.get(relative_path)!.model.getValue();
        this.lastLengths.set(path, fullText);
    }

	private processNextEdit() {
		if (this.isWaitingForEditOk || this.editQueue.length === 0) return;

		const edit = this.editQueue.shift()!;
		edit();
	}

	/** Returns the number of Unicode codepoints in a string. */
	private unicodeLength(str: string): number {
		let length = 0;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const c of str) ++length;
		return length;
	}

    rawEditFile(path: string, changes: Flower.RawOperation) {
        this.project_state.logger.info(MainWSFlowerSection, 'Editing file', path, changes);
        this.rawSend({
            clientId: this.client_id,
            revision: { type: 'Some', number: this.revisionNumbers.get(path) ?? 0 },
            parentRevision: this.revisionNumbers.get(path) ?? 0 > 0 ? this.revisionNumbers.get(path) ?? 0 - 1 : 0,
            timestamp: Date.now(),
            action: {
                type: 'EditFile',
                path,
                changes
            }
        });
		this.isWaitingForEditOk = true;
    }

	openFile(path: string) {
		this.rawSend({
			clientId: this.client_id,
			revision: { type: 'None', },
			parentRevision: 0,
			action: {
				type: 'OpenFile',
				path
			},
			timestamp: Date.now()
		})
	}

	private rawSend(msg: Flower.ClientRequest) {
		this.ws?.send(JSON.stringify(msg));
	}

    private onMessage(msg: Flower.ServerResponse) {
        this.project_state.logger.info(MainWSFlowerSection, msg);
        switch (msg.payload.type) {
            case 'InitOk':
				msg.payload.files.forEach(file => {
					this.revisionNumbers.set(file.path, file.revision.type === 'Some' ? file.revision.number : 0);
					this.lastLengths.set(file.path, file.content);
				});
                this.on_init_ok(msg);
                break;
			case 'EditFileOk':
				if (msg.revision.type === 'Some') this.revisionNumbers.set(msg.payload.path, msg.revision.number);
				this.isWaitingForEditOk = false;
				this.processNextEdit();
				break;
			case 'OpenFileOk':
				this.on_open_ok(msg);
				break;
            default:
                break;
        }
    }
}
