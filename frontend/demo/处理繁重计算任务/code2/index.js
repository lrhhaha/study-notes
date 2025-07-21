

const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', (event) => {
  // console.dir(event.target);
    const file = event.target.files[0]
  
  const reader = new FileReader()
  
  reader.onload = (e) => {
    const content = e.target.result

    const data = JSON.parse(content)

    console.log(data)
  }
  
  reader.readAsText(file) // 读取为文本
})

