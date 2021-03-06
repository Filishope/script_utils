const posthtml = require('posthtml')
const tidy = require('posthtml-tidy')({
    rules: {
        hideComments: true,
        dropEmptyElements: true
    }
})
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(__dirname, `./pages/index`);
const html = fs.readFileSync(filePath + '/index.wxml', 'utf-8')
posthtml([tidy])
.use(function (tree) {
    matchingTag(tree, 'view', 'div')
    matchingTag(tree, 'image', 'img')
    matchingTag(tree, 'text', 'span')
    matchingTag(tree, 'block', 'div')
    matchingAttrs('style', tree)
})
.process(html)
.then(function (result) {
    fs.writeFileSync(`${filePath}/index_ast.html`, result.html, 'utf8');
});

function matchingTag(tree, oldTag, newTag) {
    tree.match({
        tag: oldTag
    }, function (node) {
        node.tag = newTag
        return node;
    });
};

function matchingAttrs(attribute, tree) {
    tree.match({
        attrs: {
            [attribute]: true
        }
    }, function (node) {
        if (attribute === 'style') {
            let new_node = JSON.parse(JSON.stringify(node))
            let style_value = new_node.attrs.style
            // console.log(new_node.attrs.style)
            if (style_value.includes('{{') && style_value.includes('}}')) {
                style_value = style_value.split('{{').join('').split('}}').join('')
                style_value = `{${style_value}}`.replace(/;}/g, '}')
                                .replace(/rpx/g, 'px')
                new_node.attrs[':style'] = style_value
                delete new_node.attrs.style
            }
            return new_node;
        } else if (attribute === 'wx:if'){
            node.attrs['v-if'] = node.attrs[attribute]
            delete node.attrs[attribute]
        } else if (attribute === 'wx:elif') {
            node.attrs['v-else-if'] = node.attrs[attribute]
            delete node.attrs[attribute]
        } else if (attribute === 'wx:else') {
            node.attrs['v-else'] = node.attrs[attribute]
            delete node.attrs[attribute]
        }
    });
};