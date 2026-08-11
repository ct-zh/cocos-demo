import {
    _decorator,
    Button,
    Color,
    Component,
    EventTouch,
    Graphics,
    Label,
    LabelOutline,
    Node,
    Rect,
    resources,
    Size,
    Sprite,
    SpriteFrame,
    Texture2D,
    UITransform,
    Vec2,
    Vec3,
} from 'cc';

const { ccclass, property } = _decorator;

/**
 * 3x3 点击交换拼图（Cocos Creator 3.8.x）
 *
 * 用法：
 * 1. 场景中放一个挂有本组件的节点（建议挂在 Canvas 下）
 * 2. 可选：把整图 SpriteFrame 拖到 sourceImage
 *    不拖也会自动加载 assets/resources/puzzle_ai
 * 3. 预览：点击两块交换，全部归位即胜利
 *
 * 如何在编辑器里找到 SpriteFrame：
 * - 资源管理器点开图片左侧小三角 ▸
 * - 展开后有子项 spriteFrame（不是最外层 png）
 * - 把子项拖到 Source Image；或点属性旁圆圈，在弹出里选 spriteFrame
 */
@ccclass('PuzzleGame')
export class PuzzleGame extends Component {
    @property({
        type: SpriteFrame,
        tooltip: '整张拼图原图的 spriteFrame 子资源。可空：将自动加载 resources/puzzle_ai',
    })
    sourceImage: SpriteFrame | null = null;

    @property({ tooltip: '宫格边长，3 = 3x3' })
    gridSize = 3;

    @property({ tooltip: '单块像素边长' })
    tileSize = 180;

    @property({ tooltip: '块间距' })
    gap = 8;

    @property({ tooltip: '开局自动打乱' })
    shuffleOnStart = true;

    @property({
        tooltip: '未手动指定图片时，从 resources 自动加载的路径（不含扩展名）',
    })
    autoLoadPath = 'puzzle_ai/spriteFrame';

    private _boardRoot: Node | null = null;
    private _stepsLabel: Label | null = null;
    private _hintLabel: Label | null = null;
    private _winPanel: Node | null = null;

    /** 槽位上的 tile 节点（下标 = 槽位 0..n-1） */
    private _tiles: Node[] = [];
    /** 每个槽位当前放置的「正确编号」 */
    private _order: number[] = [];
    /** 预切好的 SpriteFrame，下标 = 正确编号 */
    private _frames: (SpriteFrame | null)[] = [];

    private _selectedSlot: number | null = null;
    private _steps = 0;
    private _locked = false;

    start() {
        this.gridSize = Math.max(2, Math.floor(this.gridSize));
        this._buildUI();
        this._bootstrap();
    }

    private _bootstrap() {
        if (this.sourceImage) {
            this._initBoard();
            return;
        }

        // 始终优先 AI 图 puzzle_ai；场景里若还存着旧路径 puzzle_sample，也会被排到后面
        const candidates = [
            'puzzle_ai/spriteFrame',
            'puzzle_ai',
            this.autoLoadPath,
            'puzzle_sample/spriteFrame',
            'puzzle_sample',
        ];
        const paths = candidates.filter((p, i) => !!p && candidates.indexOf(p) === i);
        this._loadFirstSpriteFrame(paths, 0);
    }

    private _loadFirstSpriteFrame(paths: string[], index: number) {
        if (index >= paths.length) {
            console.warn(
                '[PuzzleGame] 未找到可用图片，使用彩色数字块。请将图放到 assets/resources/，Type 设为 sprite-frame',
            );
            this._initBoard();
            return;
        }

        const path = paths[index];
        resources.load(path, SpriteFrame, (err, sf) => {
            if (!err && sf) {
                this.sourceImage = sf;
                console.log('[PuzzleGame] 已自动加载:', path);
                this._initBoard();
                return;
            }
            this._loadFirstSpriteFrame(paths, index + 1);
        });
    }

    private _initBoard() {
        this._prepareFrames();
        this._createTiles();
        this.restart();
    }

    // -------------------------------------------------------------------------
    // UI
    // -------------------------------------------------------------------------

    private _buildUI() {
        const root = this.node;

        // 顶部标题
        this._makeLabel(root, 'Title', '拼图 3×3', 42, new Vec3(0, 480, 0), new Color(240, 240, 245));

        this._hintLabel = this._makeLabel(
            root,
            'Hint',
            '点击两块交换位置',
            24,
            new Vec3(0, 420, 0),
            new Color(180, 190, 210),
        );

        this._stepsLabel = this._makeLabel(
            root,
            'Steps',
            '步数: 0',
            28,
            new Vec3(0, 360, 0),
            new Color(255, 220, 120),
        );

        // 棋盘容器
        this._boardRoot = new Node('Board');
        root.addChild(this._boardRoot);
        this._boardRoot.setPosition(0, 20, 0);
        this._boardRoot.addComponent(UITransform);

        // 重开按钮
        this._makeButton(root, 'BtnRestart', '重新开始', new Vec3(0, -360, 0), () => this.restart());

        // 胜利面板
        this._winPanel = new Node('WinPanel');
        root.addChild(this._winPanel);
        this._winPanel.setPosition(0, 20, 0);
        const winUt = this._winPanel.addComponent(UITransform);
        winUt.setContentSize(560, 320);

        const dim = this._winPanel.addComponent(Graphics);
        dim.fillColor = new Color(0, 0, 0, 180);
        dim.rect(-280, -160, 560, 320);
        dim.fill();

        this._makeLabel(this._winPanel, 'WinText', '完成！', 56, new Vec3(0, 40, 0), new Color(255, 230, 100));
        this._makeButton(this._winPanel, 'BtnAgain', '再来一局', new Vec3(0, -60, 0), () => this.restart());
        this._winPanel.active = false;
    }

    private _makeLabel(
        parent: Node,
        name: string,
        text: string,
        fontSize: number,
        pos: Vec3,
        color: Color,
    ): Label {
        const n = new Node(name);
        parent.addChild(n);
        n.setPosition(pos);
        const ut = n.addComponent(UITransform);
        ut.setContentSize(700, fontSize + 20);
        const label = n.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 8;
        label.color = color;
        label.isBold = true;
        const outline = n.addComponent(LabelOutline);
        outline.width = 2;
        outline.color = new Color(0, 0, 0, 160);
        return label;
    }

    private _makeButton(parent: Node, name: string, text: string, pos: Vec3, onClick: () => void) {
        const n = new Node(name);
        parent.addChild(n);
        n.setPosition(pos);
        const ut = n.addComponent(UITransform);
        ut.setContentSize(220, 64);

        const g = n.addComponent(Graphics);
        g.fillColor = new Color(70, 120, 220, 255);
        g.roundRect(-110, -32, 220, 64, 12);
        g.fill();

        const labelNode = new Node('Label');
        n.addChild(labelNode);
        labelNode.addComponent(UITransform).setContentSize(220, 64);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 28;
        label.lineHeight = 32;
        label.color = Color.WHITE;
        label.isBold = true;

        const btn = n.addComponent(Button);
        btn.transition = Button.Transition.SCALE;
        btn.zoomScale = 0.95;
        n.on(Button.EventType.CLICK, onClick, this);
    }

    // -------------------------------------------------------------------------
    // 图块
    // -------------------------------------------------------------------------

    private _prepareFrames() {
        const n = this.gridSize * this.gridSize;
        this._frames = new Array(n).fill(null);

        if (!this.sourceImage) {
            return;
        }

        const texture = this.sourceImage.texture as Texture2D;
        if (!texture) {
            console.warn('[PuzzleGame] sourceImage 没有 texture，改用彩色块');
            return;
        }

        // Creator 3.x 中 SpriteFrame.rect 的 y 从纹理顶部向下计算
        const full = this.sourceImage.rect;
        const tw = full.width / this.gridSize;
        const th = full.height / this.gridSize;

        for (let i = 0; i < n; i++) {
            const col = i % this.gridSize;
            const row = Math.floor(i / this.gridSize);
            const x = full.x + col * tw;
            const y = full.y + row * th;

            // 用 clone + reset，确保 UV/网格正确刷新
            const sf = this.sourceImage.clone();
            sf.packable = false;
            sf.reset({
                texture,
                rect: new Rect(x, y, tw, th),
                originalSize: new Size(tw, th),
                offset: new Vec2(0, 0),
                borderTop: 0,
                borderBottom: 0,
                borderLeft: 0,
                borderRight: 0,
            }, true);
            this._frames[i] = sf;
        }
    }

    private _createTiles() {
        if (!this._boardRoot) return;

        this._boardRoot.removeAllChildren();
        this._tiles = [];

        const n = this.gridSize * this.gridSize;
        const total = this.gridSize * this.tileSize + (this.gridSize - 1) * this.gap;
        const origin = -total / 2 + this.tileSize / 2;

        for (let slot = 0; slot < n; slot++) {
            const col = slot % this.gridSize;
            const row = Math.floor(slot / this.gridSize);
            const x = origin + col * (this.tileSize + this.gap);
            const y = -origin - row * (this.tileSize + this.gap); // 上方为第 0 行

            const tile = new Node(`Tile_${slot}`);
            this._boardRoot.addChild(tile);
            tile.setPosition(x, y, 0);

            const ut = tile.addComponent(UITransform);
            ut.setContentSize(this.tileSize, this.tileSize);

            // 底色块（无图或垫底）
            const bg = tile.addComponent(Graphics);
            bg.fillColor = this._colorForIndex(slot);
            bg.roundRect(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize, 10);
            bg.fill();

            // 图片层
            const imgNode = new Node('Image');
            tile.addChild(imgNode);
            const imgUt = imgNode.addComponent(UITransform);
            imgUt.setContentSize(this.tileSize - 6, this.tileSize - 6);
            const sp = imgNode.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.type = Sprite.Type.SIMPLE;
            imgNode.active = false;

            // 编号（无图时显示；有图时也可作调试，默认隐藏）
            const numNode = new Node('Num');
            tile.addChild(numNode);
            numNode.addComponent(UITransform).setContentSize(this.tileSize, this.tileSize);
            const num = numNode.addComponent(Label);
            num.fontSize = Math.floor(this.tileSize * 0.35);
            num.lineHeight = num.fontSize + 4;
            num.color = Color.WHITE;
            num.isBold = true;
            const ol = numNode.addComponent(LabelOutline);
            ol.width = 3;
            ol.color = new Color(0, 0, 0, 200);

            // 选中框
            const sel = new Node('Select');
            tile.addChild(sel);
            sel.addComponent(UITransform).setContentSize(this.tileSize, this.tileSize);
            const sg = sel.addComponent(Graphics);
            sg.strokeColor = new Color(255, 230, 80, 255);
            sg.lineWidth = 6;
            sg.roundRect(-this.tileSize / 2 + 3, -this.tileSize / 2 + 3, this.tileSize - 6, this.tileSize - 6, 10);
            sg.stroke();
            sel.active = false;

            tile.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                e.propagationStopped = true;
                this._onTileClick(slot);
            }, this);

            this._tiles.push(tile);
        }
    }

    private _colorForIndex(index: number): Color {
        const palette = [
            new Color(220, 80, 80),
            new Color(80, 180, 90),
            new Color(70, 130, 230),
            new Color(240, 180, 50),
            new Color(160, 90, 200),
            new Color(50, 190, 190),
            new Color(230, 120, 60),
            new Color(100, 100, 220),
            new Color(60, 160, 120),
            new Color(200, 100, 140),
            new Color(90, 160, 80),
            new Color(120, 140, 220),
        ];
        return palette[index % palette.length];
    }

    // -------------------------------------------------------------------------
    // 游戏逻辑
    // -------------------------------------------------------------------------

    public restart() {
        this._locked = false;
        this._selectedSlot = null;
        this._steps = 0;
        if (this._winPanel) this._winPanel.active = false;
        if (this._hintLabel) this._hintLabel.string = '点击两块交换位置';

        const n = this.gridSize * this.gridSize;
        this._order = [];
        for (let i = 0; i < n; i++) this._order.push(i);

        if (this.shuffleOnStart) {
            this._shuffleSolvable();
        }

        this._refreshAllTiles();
        this._updateSteps();
        this._clearSelectionVisual();
    }

    /** 打乱，并保证不是已完成状态 */
    private _shuffleSolvable() {
        const n = this._order.length;
        // 点击交换任意两块一定可达，只需随机置换且非恒等即可
        do {
            for (let i = n - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const t = this._order[i];
                this._order[i] = this._order[j];
                this._order[j] = t;
            }
        } while (this._isSolved());
    }

    private _onTileClick(slot: number) {
        if (this._locked) return;

        if (this._selectedSlot === null) {
            this._selectedSlot = slot;
            this._setSelectedVisual(slot, true);
            return;
        }

        if (this._selectedSlot === slot) {
            this._setSelectedVisual(slot, false);
            this._selectedSlot = null;
            return;
        }

        // 交换
        const a = this._selectedSlot;
        const b = slot;
        const tmp = this._order[a];
        this._order[a] = this._order[b];
        this._order[b] = tmp;

        this._setSelectedVisual(a, false);
        this._selectedSlot = null;
        this._steps += 1;
        this._updateSteps();
        this._refreshAllTiles();

        const solved = this._isSolved();
        console.log('[PuzzleGame] 交换后顺序=', this._order.join(','), '是否胜利=', solved);
        if (solved) {
            this._onWin();
        }
    }

    private _isSolved(): boolean {
        if (!this._order.length) return false;
        for (let i = 0; i < this._order.length; i++) {
            if (this._order[i] !== i) return false;
        }
        return true;
    }

    private _onWin() {
        this._locked = true;
        console.log('[PuzzleGame] 胜利触发！步数=', this._steps);

        if (this._hintLabel) {
            this._hintLabel.string = '太棒了，全部归位！';
            this._hintLabel.color = new Color(255, 220, 80);
        }
        if (this._stepsLabel) {
            this._stepsLabel.string = `胜利！共用 ${this._steps} 步`;
            this._stepsLabel.color = new Color(255, 100, 100);
        }

        if (this._winPanel) {
            // 确保盖在棋盘之上
            this._winPanel.setSiblingIndex(this.node.children.length - 1);
            this._winPanel.active = true;

            // 部分环境下 Graphics 需在显示时重绘
            const g = this._winPanel.getComponent(Graphics);
            if (g) {
                g.clear();
                g.fillColor = new Color(0, 0, 0, 200);
                g.roundRect(-280, -160, 560, 320, 16);
                g.fill();
                g.strokeColor = new Color(255, 220, 80, 255);
                g.lineWidth = 4;
                g.roundRect(-280, -160, 560, 320, 16);
                g.stroke();
            }
        }
    }

    private _updateSteps() {
        if (this._stepsLabel) {
            this._stepsLabel.string = `步数: ${this._steps}`;
        }
    }

    private _refreshAllTiles() {
        for (let slot = 0; slot < this._tiles.length; slot++) {
            this._applyPieceToSlot(slot, this._order[slot]);
        }
    }

    private _applyPieceToSlot(slot: number, pieceId: number) {
        const tile = this._tiles[slot];
        if (!tile) return;

        const bg = tile.getComponent(Graphics);
        if (bg) {
            bg.clear();
            bg.fillColor = this._colorForIndex(pieceId);
            bg.roundRect(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize, 10);
            bg.fill();
        }

        const imgNode = tile.getChildByName('Image');
        const numNode = tile.getChildByName('Num');
        const frame = this._frames[pieceId];

        if (frame && imgNode) {
            imgNode.active = true;
            const sp = imgNode.getComponent(Sprite);
            if (sp) {
                sp.spriteFrame = frame;
            }
            if (numNode) numNode.active = false;
        } else {
            if (imgNode) imgNode.active = false;
            if (numNode) {
                numNode.active = true;
                const label = numNode.getComponent(Label);
                if (label) label.string = `${pieceId + 1}`;
            }
        }
    }

    private _setSelectedVisual(slot: number, on: boolean) {
        const tile = this._tiles[slot];
        if (!tile) return;
        const sel = tile.getChildByName('Select');
        if (sel) sel.active = on;
        tile.setScale(on ? new Vec3(1.05, 1.05, 1) : new Vec3(1, 1, 1));
    }

    private _clearSelectionVisual() {
        for (let i = 0; i < this._tiles.length; i++) {
            this._setSelectedVisual(i, false);
        }
    }
}
