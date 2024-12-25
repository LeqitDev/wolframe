import { TypstToCanvas } from '$lib/ttc';

const pages: {
	canvg: TypstToCanvas;
	updated: boolean;
	svg?: string;
}[] = [];

let zoom = 1;

let maxWidth = 0;

async function update(req: App.PageRenderer.UpdateRequest) {
	console.log('Updating max width to', req.maxWidth);
	
	maxWidth = req.maxWidth;

	for (const page of pages) {
		page.canvg.setNewMaxWidth(maxWidth);
		
		page.canvg.renderSVG(page.svg!);

		send_render_success(pages.indexOf(page), page.canvg.dimension);
	}
}

async function initPage(req: App.PageRenderer.InitPageRequest) {
	const canvas = req.canvas;

	const ctx = canvas.getContext('2d');

	if (!ctx) {
		send_error('Invalid message! Missing context!');
		return;
	}

	const canvg = new TypstToCanvas(canvas, maxWidth);

	canvg.renderSVG(req.svg);

	const page = {
		canvg,
		svg: req.svg,
		updated: false,
	};

	pages.push(page);

	send_render_success(pages.indexOf(page), page.canvg.dimension);
}

async function render(req: App.PageRenderer.RenderRequest) {
	const page = pages.at(req.pageId);

	if (!page) {
		send_error('Invalid message! No cached page found!');
		return;
	}

	try {
		if (req.svg) {
			page.canvg.renderSVG(req.svg);

			page.svg = req.svg;
		}

		send_render_success(req.pageId, page.canvg.dimension);
	} catch (e) {
		send_error(e as string);
		return;
	}
}

function resize(req: App.PageRenderer.ResizeRequest) {
	if (req.pageId === -1) {
		zoom = req.zoom;
		for (const page of pages) {
			// page.canvas.width = page.dimension.width * zoom;
			// page.canvas.height = page.dimension.height * zoom;
			page.canvg.scale(zoom);
		}
	} else {
		const page = pages[req.pageId];
		if (page) {
			page.canvg.scale(zoom);
		}
	}
	send_success(req.pageId);
}

function deletePage(req: App.PageRenderer.DeleteRequest) {
	if (req.pageId < 0 || req.pageId >= pages.length) {
		send_error('Invalid message! Page not found!');
		return;
	}

	pages.splice(req.pageId, 1);

	console.log('Deleted page', req.pageId, pages);
	

	send_success(req.pageId);
}

self.onmessage = async (event: MessageEvent<App.PageRenderer.Request>) => {
	const msg = event.data;

	switch (msg.type) {
		case 'update':
			update(msg);
			break;
		case 'init-page':
			initPage(msg);
			break;
		case 'render':
			await render(msg);
			break;
		case 'resize':
			resize(msg);
			break;
		case 'delete':
			deletePage(msg);
			break;
	}
};

function send_render_success(pageId: number, dimensions: { width: number; height: number }) {
	post({
		type: 'render-success',
		pageId,
		dimensions
	});
}

function send_success(pageId: number) {
	post({ type: 'success', pageId });
}

function send_error(error: string) {
	post({ type: 'error', error });
}


function post(message: App.PageRenderer.Response) {
	self.postMessage(message);
}