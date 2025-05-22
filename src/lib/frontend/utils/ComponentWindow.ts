import { mount, unmount, type Component } from "svelte";

export class ComponentWindow {
    private _app: unknown;
    private _window: WindowProxy | null = null;
    public popout<
        Props extends Record<string, any>,
        Exports extends Record<string, any>
        >(component?: Component<Props, Exports, any>, onUnmount?: () => void) {
        const saveAddEventListener = window.addEventListener;
        const saveRemoveEventListener = window.removeEventListener;
            
        const newWindow = window.open('', 'myWindow', 'width=800,height=600,scrollbars=yes,resizable=yes');
        const stylesheets = Array.from(document.styleSheets)
        if (newWindow) {
            window.addEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
                //console.log('addEventListener', type, listener, options);
                saveAddEventListener.call(window, type, listener, options);
                newWindow.addEventListener(type, listener, options);
            }
            window.removeEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
                //console.log('removeEventListener', type, listener, options);
                saveRemoveEventListener.call(window, type, listener, options);
                newWindow.removeEventListener(type, listener, options);
            }
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
                            window: newWindow,
                        }
                    });
            }
            newWindow.document.title = 'Wolframe Preview';
            newWindow.onbeforeunload = () => {
                if (onUnmount) {
                    onUnmount();
                }
                if (this._app) {
                    unmount(this._app);
                    this._app = null;
                }
                window.addEventListener = saveAddEventListener;
                window.removeEventListener = saveRemoveEventListener;
            }
            newWindow.document.close();
            return newWindow;
        } else {
            console.error('Failed to open new window', newWindow);
            return null;
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