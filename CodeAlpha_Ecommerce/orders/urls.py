from django.urls import path
from . import views

urlpatterns = [
    path("cart/", views.view_cart, name="view_cart"),
    path("cart/add/<int:product_id>/", views.add_to_cart, name="add_to_cart"),
    path("cart/update/<int:item_id>/", views.update_cart_item, name="update_cart_item"),
    path("cart/remove/<int:item_id>/", views.remove_from_cart, name="remove_from_cart"),
    path("checkout/", views.checkout, name="checkout"),
    path(
        "order/confirmation/<int:order_id>/",
        views.order_confirmation,
        name="order_confirmation",
    ),
    path("orders/", views.order_history, name="order_history"),
    path("order/cancel/<int:order_id>/", views.cancel_order, name="cancel_order"),
]
