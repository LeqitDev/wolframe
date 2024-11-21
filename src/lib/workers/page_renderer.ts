import { DOMParser } from 'xmldom';
import { Canvg, presets, type IOptions } from 'canvg';

const pages: Canvg[] = [];

const preset = presets.offscreen({ DOMParser: DOMParser });

self.onmessage = async (event: MessageEvent<App.IPageRenderMessage>) => {
	const msg = event.data;
	
	switch (msg.type) {
		case 'render':
			{
				if (!msg.svg) {
					send_response('error', 'Invalid message! Missing svg!');
					return;
				} else if (!msg.canvas && !pages[msg.pageId]) {
					send_response('error', 'Invalid message! Missing canvas!');
					return;
				}

                if (msg.recompile) {
                    delete pages[msg.pageId];
                }
				
                if (!pages[msg.pageId]) {
					const ctx = msg.canvas!.getContext("2d");

					if (!ctx) {
						send_response('error', 'Invalid message! Missing context!');
						return;
					}
					
					
                    const canvg = await Canvg.from(ctx, msg.svg, preset as unknown as IOptions);
                    pages[msg.pageId] = canvg;
                    await canvg.render();
					send_response('success', undefined, {pageId: msg.pageId, width: msg.canvas!.width});
                } else {
                    await pages[msg.pageId].render();
					send_response('success', undefined, {pageId: msg.pageId, width: 0});
                }
			}
			break;
		case 'resize':
			{
                if (!msg.resizeArgs) {
					send_response('error', 'Invalid message! Missing resize arguments!');
					return;
				}
                const canvg = pages[msg.pageId];
                if (canvg) {
                    canvg.resize(msg.resizeArgs.width, msg.resizeArgs.height, msg.resizeArgs.preserveAspectRatio);
                }
            }
			break;
	}
	
};


function send_response(type: 'error' | 'success', error?: string, canvasInfos?: { pageId: number, width: number }) {
	self.postMessage({ type, canvasInfos, error } as App.IPageRenderResponse);
}