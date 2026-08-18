import RichTextEditor from './RichTextEditor.jsx';

function IntroductionEditor({ value, onChange, error }) {
  return (
    <RichTextEditor label="Introduction" value={value} onChange={onChange} error={error} withImage withVideoEmbedPlaceholders />
  );
}

export default IntroductionEditor;
