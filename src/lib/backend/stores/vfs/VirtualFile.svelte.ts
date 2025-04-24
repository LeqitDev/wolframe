import { FileType, type File } from '@/app.types';
import type { Monaco } from '../../monaco';

export class VirtualFile {
    modified: boolean = $state(false); // file is modified
    open: boolean = $state(false); // open folder
    input: boolean = $state(false); // put input field instead of name
    renaming: boolean = $state(false); // don't delete the entry on submit just rename
    error: string | null = $state(null); // error message
    model: Monaco.editor.ITextModel | null = null; // monaco model
    extension?: string; // file extension

    file: File;

    constructor(file: File) {
        this.file = file;
        if (file.type === FileType.File) {
            this.extension = file.name.split('.').pop() || undefined;
        }
    }

    setModel(model: Monaco.editor.ITextModel) {
        this.model = model;
        this.modified = false;
    }
}