import RenderController from '../Controllers/RenderController/RenderController';

export interface EditorProps {
    container: HTMLDivElement;
}

class Editor {
    private _initialized = false;

    public renderController: RenderController;

    constructor() {
        this.renderController = new RenderController();

        // @ts-expect-error
        window.editor = this;
    }

    public init = async ({ container }: EditorProps) => {
        this.renderController.init({ container });
        this._initialized = true;
    };

    public dispose = () => {
        if (!this._initialized) return;
        this.renderController.dispose();
    };
}

export default new Editor();
