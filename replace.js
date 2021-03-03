const fs = require('fs');
const path = require('path');
const args = process.argv.splice(2);
if (args.length !== 1) {
  console.error('只允许传入一个参数');
  return;
}
const filePath = path.resolve(__dirname, `./${args[0]}`);

const transform = file => {
  const transform = file.toString()
    .replace(/wx:/g, 'v-')
    .replace(/wx:elif/g, 'v-else-if')
    .replace(/wx:key/g, ':key')
    .replace(/\s*data-/g, ' :data-')

    .replace(/<view/g, '<div')
    .replace(/<\/view>/g, '</div>')
    .replace(/<text/g, '<span')
    .replace(/<\/text>/g, '</span>')
    .replace(/<image/g, '<img')
    .replace(/<\/image>/g, '')
    .replace(/<block/g, '<div')
    .replace(/<\/block>/g, '</div>')
    .replace(/<button/g, '<van-button')
    .replace(/<\/button>/g, '</van-button>')

    .replace(/bindtap/g, '@click')
    .replace(/catchtap/g, '@click')
    .replace(/bindchange/g, '@change')

    .replace(/rpx/g, 'px')
    .replace(/style\s?=\s?['"](?:([^'"]*):){{([^}}]*)}}([^>]*)(['"])/g, ':style="{\'$1\':$2$3}$4')
    .replace(/style\s?=\s?['"]{{([^}}]*)}}([^>]*)(['"])/g, ':style="$1$2$3')
    .replace(/class\s?=\s?(['"]){{\s?/g, ':class=$1')

    .replace(/src\s?=\s?(['"]){{([^>]*)}}(['"])/g, ':src=$1$2$3')
    .replace(/<img([^>]*)src\s?=\s?['"]{{\s?ossImgPath\s?}}([^"']*)['"]/g, '<img$1:src="ossImgPath + \'$2\'"')

    .replace(/['"]{{\s?/g, '\"')
    .replace(/\s?}}['"]/g, '\"')

    .replace(/v-for\s?=\s?(['"])([^'"]*)(['"])\s*(?:v-for-item="([^"']*)")?\s*(?:v-for-index="([^"']*)")?/g, 'v-for=$1($4,$5) in $2$3 ')
    .replace(/v-for\s?=\s?(['"])\(,([^'"]*)\)/g, 'v-for=$1(item,$2)')
    .replace(/v-for\s?=\s?(['"])\(([^'"]*),\)/g, 'v-for=$1($2,index)');

  return ` <template>
                  ${transform} 
                </template>
              `;
};
const parseJs = file => {
  let parseJs = file.substring(file.indexOf('Page({'));
  if (parseJs.lastIndexOf(')};') !== -1) {
    parseJs = parseJs.substring(0, parseJs.lastIndexOf(')};'));
  } else if (parseJs.lastIndexOf(')}') !== -1) {
    parseJs = parseJs.substring(0, parseJs.lastIndexOf(')}'));
  }
  parseJs = parseJs.substring(5);

  parseJs = parseJs.replace(/app\.ossImgPath/g, 'this.$root.ossImgPath')
    .replace(/self\./g, 'this.')
    .replace(/let\s*self\s*=\s*this;?/g, '')
    .replace(/this\.data/g, 'this')
    .replace(/this\.setData\({([\s\S]*?)}\);?/g, (match, $1) => {
      let result;
      const arr = $1.split('\n').map(v => {
        // 处理写在后面的注释
        return v.replace(/[\t\s]/g, '').replace(/,/g, '');
      }).filter(item => {
        // 过滤注释的代码
        return item && !item.startsWith('//');
      });
      // 处理箭头函数
      arr.map((v, i) => {
        if (v.includes('=>')) {
          if (i === 0) {
            arr[0] = `this.${v.split(':')[0]} = ${v.split(':')[1]}`;
          }
          result = arr.join('\n') + '这里记得手动改//TODO';
        }
      });
      const attrs = arr.map(attr => {
        if (attr.includes(':')) {
          return `this.${attr.split(':')[0]} = ${attr.split(':')[1]}`;
        } else {
          return `this.${attr} = ${attr}`;
        }
      });
      return result || attrs.join('\n');
    })
    .replace(/wx\.showToast\({([\s\S]*?)}\);?/g, (match, $1) => {
      let result;
      const attrStr = $1.replace(/[\t\s]/g, '');
      attrStr.split(',').map(attr => {
        if (attr.split(':')[0] === 'title') {
          result = `this.$toast(${attr.split(':')[1]})`;
        }
      });
      return result;
    });
  return parseJs;
};
const parseCss = file => {
  const parseCss = file.replace(/\stext(\s*{)/g, ' span$1')
    .replace(/\sview(\s*{)/g, ' div$1')
    .replace(/\simage(\s*{)/g, ' img$1')
    .replace(/(\d?\.?\d)+rpx/g, '$1px');
  return parseCss;
};
const isExisted = (filepath) => {
  return new Promise((resolve, reject) => {
    fs.access(filepath, (err) => {
      if (err) {
        reject(err.message);
      } else {
        resolve();
      }
    });
  });
};
fs.readdir(filePath, (err, files) => {
  if (err) {
    console.log(err);
    return;
  }
  files.map(async v => {
    try {
      await isExisted(`${filePath}/${v}/${v}.wxml`);
      await isExisted(`${filePath}/${v}/${v}.js`);
      await isExisted(`${filePath}/${v}/${v}.wxss`);
      fs.mkdir(`${filePath}/${v}/${v}`, {
        recursive: true
      }, (err) => {
        if (err) throw err;
        fs.readFile(`${filePath}/${v}/${v}.wxml`, 'utf8', function(err, file) {
          if (err) {
            console.log(err);
            return;
          }
          fs.writeFile(`${filePath}/${v}/${v}/${v}.vue`, transform(file), 'utf8', function(err) {
            if (err) {
              console.log(err);
              return;
            }
          });
        });
        fs.readFile(`${filePath}/${v}/${v}.js`, 'utf8', function(err, file) {
          if (err) {
            console.log(err);
            return;
          }
          fs.writeFile(`${filePath}/${v}/${v}/${v}_new.js`, parseJs(file), 'utf8', function(err) {
            if (err) {
              console.log(err);
              return;
            }
          });
        });
        fs.readFile(`${filePath}/${v}/${v}.wxss`, 'utf8', function(err, file) {
          if (err) {
            console.log(err);
            return;
          }
          fs.writeFile(`${filePath}/${v}/${v}/${v}.css`, parseCss(file), 'utf8', function(err) {
            if (err) {
              console.log(err);
              return;
            }
          });
        });
      });
    } catch (error) {
      return;
    }
  });
});
