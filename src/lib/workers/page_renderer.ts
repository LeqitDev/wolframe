import { DOMParser } from 'xmldom';
import { Canvg, presets, type IOptions } from 'canvg';

const pages: {canvg: Canvg; canvas: OffscreenCanvas}[] = [];

const preset = presets.offscreen({ DOMParser: DOMParser });

self.onmessage = async (event: MessageEvent<App.PageRenderer.Request>) => {
	const msg = event.data;
	
	switch (msg.type) {
		case 'render':
			{
				const page = pages.at(msg.pageId);

				if (!msg.svg) {
					send_error('Invalid message! Missing svg!');
					return;
				}

                if (msg.recompile) {
					if (!msg.canvas && !page) {
						send_error('Invalid message! No canvas provided!');
						return;
					}

					const ctx = (msg.canvas ?? page!.canvas).getContext("2d");

					if (!ctx) {
						send_error('Invalid message! Missing context!');
						return;
					}
					
					try {
						const canvg = await Canvg.from(ctx, msg.svg, preset as unknown as IOptions);
						if (page) {
							page.canvg = canvg;
						} else {
							pages[msg.pageId] = {canvg, canvas: msg.canvas!};
						}

						if (page) {
							canvg.resize(page.canvas.width, page.canvas.height);
						}

						await canvg.render();
					} catch (e) {
						send_error(e as string);
						return;
					}

					send_success(msg.pageId, pages[msg.pageId].canvas.width, pages[msg.pageId].canvas.height);
                } else {
					if (!page) {
						send_error('Invalid message! No cached page found!');
						return;
					}

					try {
						await page.canvg.render();
					} catch (e) {
						send_error(e as string);
						return;
					}
					send_success(msg.pageId, 0, 0);
				}
			}
			break;
		case 'resize':
			{
                const page = pages[msg.pageId];
                if (page) {
					console.log('resize', msg.width, msg.height, msg.preserveAspectRatio);
					
                    page.canvg.resize(msg.width, msg.height, msg.preserveAspectRatio);
                }
            }
			break;
	}
	
};

function send_success(pageId: number, width: number, height: number) {
	self.postMessage({ type: 'success', pageId, width, height} as App.PageRenderer.Response);
}

function send_error(error: string) {
	self.postMessage({ type: 'error', error } as App.PageRenderer.Response);
}