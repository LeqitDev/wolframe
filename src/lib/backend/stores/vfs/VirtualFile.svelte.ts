import { type File } from '@/app.types';

export class VirtualFile {
    modified: boolean = $state(false); // file is modified
    open: boolean = $state(false); // open folder
    input: boolean = $state(false); // put input field instead of name
    renaming: boolean = $state(false); // don't delete the entry on submit just rename
    error: string | null = $state(null); // error message

    file: File;

    constructor(file: File) {
        this.file = file;
    }
}