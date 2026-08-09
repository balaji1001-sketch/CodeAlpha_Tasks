from django.db import transaction
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from store.models import Product
from .models import Cart, CartItem, Order, OrderItem


@login_required
def add_to_cart(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    cart, created = Cart.objects.get_or_create(user=request.user)

    cart_item, item_created = CartItem.objects.get_or_create(
        cart=cart, product=product, defaults={"quantity": 1}
    )
    if not item_created:
        cart_item.quantity += 1
        cart_item.save()

    messages.success(request, f"{product.name} added to cart.")
    return redirect("product_detail", pk=product_id)


@login_required
def view_cart(request):
    cart, created = Cart.objects.get_or_create(user=request.user)
    items = cart.items.select_related("product").all()
    total = sum(item.product.price * item.quantity for item in items)
    return render(request, "orders/cart.html", {"items": items, "total": total})


@login_required
def update_cart_item(request, item_id):
    item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
    if request.method == "POST":
        try:
            quantity = int(request.POST.get("quantity", 1))
        except ValueError:
            messages.error(request, "Invalid quantity.")
            return redirect("view_cart")

        if quantity <= 0:
            item.delete()
            messages.info(request, "Item removed from cart.")
        elif quantity > item.product.stock:
            messages.error(request, f"Only {item.product.stock} in stock.")
        else:
            item.quantity = quantity
            item.save()
    return redirect("view_cart")


@login_required
def remove_from_cart(request, item_id):
    item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
    item.delete()
    messages.info(request, "Item removed from cart.")
    return redirect("view_cart")


@login_required
def checkout(request):
    cart, _ = Cart.objects.get_or_create(user=request.user)
    items = cart.items.select_related("product").all()

    if not items:
        messages.warning(request, "Your cart is empty.")
        return redirect("view_cart")

    for item in items:
        if item.quantity > item.product.stock:
            messages.error(
                request,
                f"Not enough stock for {item.product.name}. Only {item.product.stock} left.",
            )
            return redirect("view_cart")

    with transaction.atomic():
        total = sum(item.product.price * item.quantity for item in items)

        order = Order.objects.create(
            user=request.user, total_amount=total, status="pending"
        )

        for item in items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price,
            )
            item.product.stock -= item.quantity
            item.product.save()

        items.delete()

    messages.success(request, "Order placed successfully!")
    return redirect("order_confirmation", order_id=order.id)


@login_required
def order_confirmation(request, order_id):
    order = get_object_or_404(Order, id=order_id, user=request.user)
    return render(request, "orders/order_confirmation.html", {"order": order})


@login_required
def order_history(request):
    orders = Order.objects.filter(user=request.user).order_by("-created_at")
    return render(request, "orders/order_history.html", {"orders": orders})


@login_required
def cancel_order(request, order_id):
    order = get_object_or_404(Order, id=order_id, user=request.user)

    if order.status != "pending":
        messages.error(request, "This order can no longer be cancelled.")
        return redirect("order_confirmation", order_id=order.id)

    with transaction.atomic():
        for item in order.items.select_related("product"):
            item.product.stock += item.quantity
            item.product.save()
        order.status = "cancelled"
        order.save()

    messages.success(request, f"Order #{order.id} has been cancelled.")
    return redirect("order_history")
