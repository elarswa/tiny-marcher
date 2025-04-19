import EditorContainer from './Components/EditorContainer/EditorContainer';
import ErrorBoundary from './Components/ErrorBoundary/ErrorBoundary';

function App() {
    return (
        <>
            <ErrorBoundary>
                <EditorContainer />
            </ErrorBoundary>{' '}
        </>
    );
}

export default App;
