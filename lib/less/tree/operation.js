(function (tree) {

tree.Operation = function (op, operands, isSpaced) {
    this.op = op.trim();
    this.operands = operands;
    this.isSpaced = isSpaced;
};
tree.Operation.prototype.eval = function (env) {
    var a = this.operands[0].eval(env),
        b = this.operands[1].eval(env),
        temp;

    if (env.isMathsOn()) {
        if (a instanceof tree.Dimension && b instanceof tree.Color) {
            if (this.op === '*' || this.op === '+') {
                temp = b, b = a, a = temp;
            } else {
                throw { name: "OperationError",
                        message: "Can't substract or divide a color from a number" };
            }
        }
        if (!a.operate) {
            throw { name: "OperationError",
                    message: "Operation on an invalid type" };
        }

        return a.operate(env, this.op, b);
    } else {
        return new(tree.Operation)(this.op, [a, b], this.isSpaced);
    }
};
tree.Operation.prototype.toCSS = function (env) {
    var separator = this.isSpaced ? " " : "";
    return this.operands[0].toCSS() + separator + this.op + separator + this.operands[1].toCSS();
};

tree.operate = function (env, op, a, b) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
    }
};

})(require('../tree'));
