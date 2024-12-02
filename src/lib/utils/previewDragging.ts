let isDragging = false;
	let startX = 0;
	let startY = 0;
	let scrollLeft = 0;
	let scrollTop = 0;

export class PreviewDragger {
    private canvasContainer: HTMLElement;

    constructor(canvasContainer: HTMLElement) {
        this.canvasContainer = canvasContainer;
        this.canvasContainer.addEventListener('mousedown', this.onMouseDown);
        this.canvasContainer.addEventListener('mouseup', this.onMouseUp);
        this.canvasContainer.addEventListener('mousemove', this.onMouesMove);
        this.canvasContainer.addEventListener('mouseleave', this.onMouseUp);
    }

    dispose() {
        this.canvasContainer.removeEventListener('mousedown', this.onMouseDown);
        this.canvasContainer.removeEventListener('mouseup', this.onMouseUp);
        this.canvasContainer.removeEventListener('mousemove', this.onMouesMove);
        this.canvasContainer.removeEventListener('mouseleave', this.onMouseUp);
    }

	onMouseDown(e: MouseEvent) {
		isDragging = true;
		startX = e.pageX - this.canvasContainer.offsetLeft;
		startY = e.pageY - this.canvasContainer.offsetTop;
		scrollLeft = this.canvasContainer.scrollLeft;
		scrollTop = this.canvasContainer.scrollTop;

		e.preventDefault();
	}

	onMouseUp() {
		isDragging = false;
	}

	onMouesMove(e: MouseEvent) {
		if (!isDragging) return;

		const x = e.pageX - this.canvasContainer.offsetLeft;
		const y = e.pageY - this.canvasContainer.offsetTop;

		const walkX = (x - startX) * 2;
		const walkY = (y - startY) * 2;

		this.canvasContainer.scrollLeft = scrollLeft - walkX;
		this.canvasContainer.scrollTop = scrollTop - walkY;
	}
}