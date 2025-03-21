export abstract class ViewNode {
    protected _name: string;
    protected _path: string;
    protected _parent?: FolderViewNode;
    protected _editing: boolean = $state(false);

    constructor(name: string, parent?: FolderViewNode, editing?: boolean) {
        this._name = name;
        if (parent) {
            this._path = `${parent.path}/${name}`;
        } else {
            this._path = name;
        }
        this._parent = parent;
        this._editing = editing || false;
    }

    rename(newName: string) {
        this._path = this._path.replace(this._name, newName);
        this._name = newName;
    }

    delete() {
        if (this._parent) {
            this._parent.removeChild(this);
        }
    }

    get isFolder(): boolean {
        return this instanceof FolderViewNode;
    }

    get name() {
        return this._name;
    }

    get path() {
        return this._path;
    }

    get parent() {
        return this._parent;
    }

    set editing(value: boolean) {
        this._editing = value;
    }

    get editing() {
        return this._editing;
    }
}

export class FileViewNode extends ViewNode {
    protected _size: number;
    protected _mimetype: string;
    protected _etag: string;
    protected _lastModified: Date;

    constructor(name: string, parent: FolderViewNode, editing?: boolean, size?: number, mimetype?: string, etag?: string, lastModified?: Date) {
        super(name, parent, editing);
        this._size = size || 0;
        this._mimetype = mimetype || '';
        this._etag = etag || '';
        this._lastModified = lastModified || new Date();
    }

    move(newParent: FolderViewNode) {
        if (this._parent === newParent) return;
        this._parent!.removeChild(this);
        newParent.addChild(this);
        this._parent = newParent;
        this._path = `${newParent.path}/${this._name}`;
    }
}

export class FolderViewNode extends ViewNode {
    private _children: ViewNode[] = $state([]);
    private _isExpanded: boolean = $state(false);

    addChild(child: ViewNode) {
        this._children.push(child);
    }

    removeChild(child: ViewNode) {
        this._children = this._children.filter((c) => c !== child);
    }

    move(newParent: FolderViewNode) {
        if (!this._parent ||
            this._parent === newParent || 
            newParent.path.startsWith(this.path)) return;
        this._parent.removeChild(this);
        newParent.addChild(this);
        this._parent = newParent;
    }

    get children() {
        return this._children;
    }

    set isExpanded(value: boolean) {
        this._isExpanded = value;
    }

    get isExpanded() {
        return this._isExpanded;
    }

    get depth(): number {
        if (!this.parent) return 0;
        return this.parent.depth + 1;
    }

    get isRoot() {
        return !this.parent;
    }
}