import Node from '../node'
import Color from './color'
import Dimension from './dimension'
import Numeric from './numeric'
import Value from './value'
import { operate } from '../util'

/**
 * Values can only be 3 Nodes
 *   e.g. [Value, Value, Value]
 *        [Operation, Value, Value]
 */
class Operation extends Node {
  /**
   * Represents lhs, op, rhs
   */
  values: [Node, Value, Node]

  eval(context) {
    super.eval(context)

    let result
    const values = this.values
    let a = values[0]
    let b = values[2]
    let op = values[1].value

    if (context.isMathOn(op)) {
      op = op === './' ? '/' : op

      if (a instanceof Dimension && b instanceof Dimension) {
        
      } else if (a instanceof Dimension && b instanceof Numeric) {
        result = operate(op, a.value, b.value)
        return new Dimension({ value: result, nodes: [new Numeric(result), a.values[1].clone()] })
      } else if (a instanceof Color) {
        
      }

      
      
      if (a instanceof Dimension && b instanceof Color) {
        a = a.toColor()
      }
      if (b instanceof Dimension && a instanceof Color) {
          b = b.toColor()
      }
      if (!a.operate) {
          if (a instanceof Operation && a.op === '/' && context.math === MATH.PARENS_DIVISION) {
              return new Operation(this.op, [a, b], this.isSpaced);
          }
          throw { type: 'Operation',
              message: 'Operation on an invalid type' };
      }

      return result
    } else {
      return this
    }
  }

  genCSS(context, output) {
      this.operands[0].genCSS(context, output);
      if (this.isSpaced) {
          output.add(' ');
      }
      output.add(this.op);
      if (this.isSpaced) {
          output.add(' ');
      }
      this.operands[1].genCSS(context, output);
  }
}

Operation.prototype.type = 'Operation';
export default Operation;
