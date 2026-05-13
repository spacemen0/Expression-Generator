import re


class Node:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right
        self.x = 0
        self.y = 0


def tokenize(expression):
    tokens = re.findall(
        r"[a-zA-Z_][a-zA-Z0-9_]*|\d*\.\d+|\d+|[\+\-\*\/\^\(\)]", expression
    )
    return [t.strip() for t in tokens if t.strip()]


def infix_to_postfix(tokens):
    precedence = {"+": 1, "-": 1, "*": 2, "/": 2, "^": 3}
    associativity = {"+": "L", "-": "L", "*": "L", "/": "L", "^": "R"}
    output, stack = [], []
    for token in tokens:
        if re.match(r"[a-zA-Z0-9_\.]+", token) and token not in precedence:
            output.append(token)
        elif token == "(":
            stack.append(token)
        elif token == ")":
            while stack and stack[-1] != "(":
                output.append(stack.pop())
            if not stack:
                raise ValueError("Mismatched parentheses")
            stack.pop()
        elif token in precedence:
            while (
                stack
                and stack[-1] != "("
                and (
                    (
                        associativity[token] == "L"
                        and precedence[token] <= precedence.get(stack[-1], 0)
                    )
                    or (
                        associativity[token] == "R"
                        and precedence[token] < precedence.get(stack[-1], 0)
                    )
                )
            ):
                output.append(stack.pop())
            stack.append(token)
    while stack:
        if stack[-1] == "(":
            raise ValueError("Mismatched parentheses")
        output.append(stack.pop())
    return output


def build_tree(postfix):
    stack, operators = [], {"+", "-", "*", "/", "^"}
    for token in postfix:
        if token in operators:
            if len(stack) < 2:
                raise ValueError(f"Invalid expression for {token}")
            right, left = stack.pop(), stack.pop()
            stack.append(Node(token, left, right))
        else:
            stack.append(Node(token))
    if len(stack) != 1:
        raise ValueError("Invalid expression")
    return stack[0]


def layout_tree(node, x_min, x_max, depth, y_step):
    node.x = (x_min + x_max) / 2
    node.y = depth * y_step
    if node.left:
        layout_tree(node.left, x_min, node.x, depth + 1, y_step)
    if node.right:
        layout_tree(node.right, node.x, x_max, depth + 1, y_step)


def get_tree_depth(node):
    if not node:
        return 0
    return 1 + max(get_tree_depth(node.left), get_tree_depth(node.right))


def generate_svg_string(expression):
    tokens = tokenize(expression)
    postfix = infix_to_postfix(tokens)
    root = build_tree(postfix)
    depth = get_tree_depth(root)
    # larger nodes, more vertical spacing, larger text
    node_radius, y_step = 20, 80
    width, height = max(400, (2**depth) * 40), depth * y_step + 100
    layout_tree(root, 0, width, 1, y_step)
    svg_header = f'<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">\n'
    svg_footer = "</svg>"
    lines, nodes = [], []

    def traverse(node):
        if not node:
            return
        if node.left:
            lines.append(
                f'  <line x1="{node.x}" y1="{node.y}" x2="{node.left.x}" y2="{node.left.y}" stroke="black" stroke-width="2" />'
            )
            traverse(node.left)
        if node.right:
            lines.append(
                f'  <line x1="{node.x}" y1="{node.y}" x2="{node.right.x}" y2="{node.right.y}" stroke="black" stroke-width="2" />'
            )
            traverse(node.right)
        nodes.append(
            f'  <circle cx="{node.x}" cy="{node.y}" r="{node_radius}" fill="white" stroke="black" stroke-width="2" />'
        )
        nodes.append(
            f'  <text x="{node.x}" y="{node.y}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="18" font-weight="bold">{node.value}</text>'
        )

    traverse(root)
    return (
        svg_header + "\n".join(lines) + "\n" + "\n".join(nodes) + "\n" + svg_footer
    )
