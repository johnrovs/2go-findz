import RichTextEditor from './RichTextEditor.jsx';

function RecommendationContentEditor({ id, value, onChange, error }) {
  return <RichTextEditor id={id} label="Why We Recommend It" value={value} onChange={onChange} error={error} withUndoRedo compact />;
}

export default RecommendationContentEditor;
