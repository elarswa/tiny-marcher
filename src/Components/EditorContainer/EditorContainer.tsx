import React, { useEffect, useRef } from 'react';
import Editor from '../../Classes/Editor/Editor';

const EditorContainer: React.FC = () => {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!container.current) return;
        Editor.init({ container: container.current });

        return () => {
            Editor.dispose();
        };
    }, []);

    return (
        <div
            id='editor'
            style={{
                gridArea: 'editor',
                width: '100%',
                height: '100%',
                position: 'relative',
            }}
            ref={container}></div>
    );
};

export default EditorContainer;
