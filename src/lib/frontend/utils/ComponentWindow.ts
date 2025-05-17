import { mount, unmount, type Component } from "svelte";

export class ComponentWindow {
    private _app: unknown;
    private _window: WindowProxy | null = null;
    public popout<
        Props extends Record<string, any>,
        Exports extends Record<string, any>
        >(component?: Component<Props, Exports, any>) {
        const newWindow = window.open('', '_blank', 'width=800,height=600,popup,resizable,scrollbars');
        const stylesheets = Array.from(document.styleSheets)
        if (newWindow) {
            this._window = newWindow;
            const styleElement = newWindow.document.createElement('style');
            styleElement.textContent = stylesheets.map((entry) => Array.from(entry.cssRules).map((rule) => rule.cssText).join('\n')).join('\n')
            newWindow.document.head.appendChild(styleElement);
            newWindow.document.getElementsByTagName('html')[0].setAttribute('data-theme', 'dark')
            if (component) {
                this._app = mount(component, {
                    target: newWindow.document.body,
                    props: {
                        inPopup: true,
                    }
                });
            }
            newWindow.document.title = 'Wolframe Preview';

            newWindow.document.close();
            return newWindow;
        } else {
            throw new Error('Failed to open a new window');
        }
    }

    public unmount() {
        if (this._app) {
            unmount(this._app);
        }
        if (this._window) {
            this._window.close();
        }
    }
}