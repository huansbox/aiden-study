const panel = document.getElementById('connection');
async function openPractice() {
  await KidsAuth.ready;
  if (KidsAuth.state.status !== 'connected') {
    KidsAuth.renderConnection(panel, openPractice);
    return;
  }
  const frame = document.createElement('iframe');
  frame.title = document.title;
  frame.allow = 'microphone';
  frame.src = '../api/v1/' + document.body.dataset.practice + '/';
  panel.replaceWith(frame);
}
openPractice();
