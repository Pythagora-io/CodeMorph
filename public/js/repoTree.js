class TreeNode {
  constructor(path, fileType, summary = null) {
    this.path = path;
    this.fileType = fileType;
    this.summary = summary;
    this.children = [];
    this.parent = null;
  }

  addChild(childNode) {
    this.children.push(childNode);
    childNode.parent = this;
  }
}

function buildTree(fileStructure) {
  const root = new TreeNode('/', 'tree');

  fileStructure.forEach(item => {
    const pathParts = item.path.split('/');
    let currentNode = root;

    pathParts.forEach((part, index) => {
      let existingChild = currentNode.children.find(child => child.path === part);

      if (!existingChild) {
        const isLastPart = index === pathParts.length - 1;
        const newNode = new TreeNode(
          part,
          isLastPart ? item.fileType : 'tree',
          isLastPart ? item.summary : null
        );
        currentNode.addChild(newNode);
        currentNode = newNode;
      } else {
        currentNode = existingChild;
      }
    });

    if (item.fileType === 'tree' && !currentNode.children) {
      currentNode.children = [];
    }
  });

  return root;
}

function renderTree(node, container, isRoot = true) {
  console.log('Rendering tree for node:', node.path);

  let ul;
  if (isRoot) {
    ul = container;
  } else {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = node.path;
    span.className = node.fileType === 'tree' ? 'folder' : 'file';
    span.style.cursor = 'pointer'; // Change cursor to pointer when hovering over files

    if (node.fileType === 'tree') {
      console.log('Adding click listener to folder:', node.path);
      span.addEventListener('click', (e) => {
        console.log('Folder clicked:', node.path);
        e.preventDefault();
        li.classList.toggle('expanded');
        console.log('Expanded class toggled. New class list:', li.classList);
        const childUl = li.querySelector('ul');
        if (childUl) {
          childUl.style.display = childUl.style.display === 'none' ? 'block' : 'none';
          console.log('Child UL display toggled:', childUl.style.display);
        }
      });
    } else {
      // Log for file click listener
      console.log('File ready for click action:', node.path);
    }

    li.appendChild(span);
    container.appendChild(li);

    if (node.children && node.children.length > 0) {
      ul = document.createElement('ul');
      ul.style.display = 'none';
      li.appendChild(ul);
    } else {
      return;
    }
  }

  if (node.children) {
    node.children.forEach(child => {
      renderTree(child, ul, false);
    });
  }

  console.log('Tree rendered for node:', node.path);
}

window.repoTree = {
  buildTree,
  renderTree
};