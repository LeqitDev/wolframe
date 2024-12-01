import { DOMParser } from 'xmldom';
import { Canvg, presets, type IOptions } from 'canvg';

const pages: {
	canvg: Canvg;
	canvas: OffscreenCanvas;
	dimension: { width: number; height: number };
}[] = [];

const preset = presets.offscreen({ DOMParser: DOMParser });

let zoom = 1;

let maxWidth = 0;

async function update(req: App.PageRenderer.UpdateRequest) {
	console.log('Updating max width to', req.maxWidth);
	
	maxWidth = req.maxWidth;

	for (const page of pages) {
		page.dimension = { width: page.canvas.width * (maxWidth/page.canvas.width), height: page.canvas.height * (maxWidth/page.canvas.width) };
		page.canvg.resize(page.dimension.width * zoom, page.dimension.height * zoom);

		await page.canvg.render();

		const blob = await page.canvas.convertToBlob({ type: 'image/png' });
		const url = URL.createObjectURL(blob);

		send_render_success(pages.indexOf(page), url, page.dimension);
	}
}

async function cachedRender(req: App.PageRenderer.RenderRequest) {
	const page = pages.at(req.pageId);

	if (!req.svg) {
		send_error('Invalid message! Missing svg!');
		return;
	}
	if (!page) {
		send_error('Invalid message! No cached page found!');
		return;
	}

	try {
		await page.canvg.render();

		const blob = await page.canvas.convertToBlob({ type: 'image/png' });
		const url = URL.createObjectURL(blob);

		send_render_success(req.pageId, url, page.dimension);
	} catch (e) {
		send_error(e as string);
		return;
	}
}

async function forceRender(req: App.PageRenderer.RenderRequest) {
	const page = pages.at(req.pageId);

	if (!req.svg) {
		send_error('Invalid message! Missing svg!');
		return;
	}

	const canvas = page?.canvas ?? new OffscreenCanvas(300, 150);

	const ctx = canvas.getContext('2d');

	if (!ctx) {
		send_error('Invalid message! Missing context!');
		return;
	}

	try {
		const canvg = await Canvg.from(ctx, req.svg, preset as unknown as IOptions);
		if (page) {
			page.canvg = canvg; // Update the cached page
			canvg.resize(page.dimension.width * zoom, page.dimension.height * zoom);
		}

		await canvg.render();

		if (!page) {
			pages[req.pageId] = {
				canvg,
				canvas,
				dimension: { width: canvas.width * (maxWidth/canvas.width), height: canvas.height * (maxWidth/canvas.width) }
			};

			const page = pages[req.pageId];

			canvg.resize(page.dimension.width * zoom, page.dimension.height * zoom);

			await canvg.render();
		}

		const blob = await canvas.convertToBlob({ type: 'image/png' });
		const url = URL.createObjectURL(blob);
		
		send_render_success(req.pageId, url, pages[req.pageId].dimension);
	} catch (e) {
		send_error(e as string);
		return;
	}
}

function resize(req: App.PageRenderer.ResizeRequest) {
	if (req.pageId === -1) {
		zoom = req.zoom;
		for (const page of pages) {
			page.canvg.resize(page.dimension.width * zoom, page.dimension.height * zoom);
		}
	} else {
		const page = pages[req.pageId];
		if (page) {
			page.canvg.resize(page.dimension.width * req.zoom, page.dimension.height * req.zoom);
		}
	}
	send_success(req.pageId);
}

function deletePage(req: App.PageRenderer.DeleteRequest) {
	if (req.pageId < 0 || req.pageId >= pages.length) {
		send_error('Invalid message! Page not found!');
		return;
	}

	delete pages[req.pageId];

	send_success(req.pageId);
}

self.onmessage = async (event: MessageEvent<App.PageRenderer.Request>) => {
	const msg = event.data;

	switch (msg.type) {
		case 'update':
			update(msg);
			break;
		case 'render':
			if (msg.cached) {
				await cachedRender(msg);
			} else {
				await forceRender(msg);
			}
			break;
		case 'resize':
			resize(msg);
			break;
		case 'delete':
			deletePage(msg);
			break;
	}
};

function send_render_success(pageId: number, png: string, dimensions: { width: number; height: number }) {
	self.postMessage({
		type: 'render-success',
		pageId,
		png,
		dimensions
	} as App.PageRenderer.SuccessRenderResponse);
}

function send_success(pageId: number) {
	self.postMessage({ type: 'success', pageId } as App.PageRenderer.SuccessResponse);
}

function send_error(error: string) {
	self.postMessage({ type: 'error', error } as App.PageRenderer.Response);
}
