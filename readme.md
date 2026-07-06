# Getting Started

Welcome to your new CAP project.

It contains these folders and files, following our recommended project layout:

| File or Folder | Purpose                              |
| -------------- | ------------------------------------ |
| `app/`         | content for UI frontends goes here   |
| `db/`          | your domain models and data go here  |
| `srv/`         | your service models and code go here |
| `readme.md`    | this getting started guide           |

## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start with your domain model, in a CDS file in `db/`

## Learn More

Learn more at <https://cap.cloud.sap>.

### Database Schema Relations (Core Entities)

| Source Entity                  | Target Entity                          | Relation Type             | Brief Description                                                              |
| :----------------------------- | :------------------------------------- | :------------------------ | :----------------------------------------------------------------------------- |
| **salesorder.Products**        | salesorder.Producers                   | Association               | Product is linked to a specific Producer                                       |
| **salesorder.Products**        | salesorder.Categories                  | Association               | Product is linked to a Category (game genre)                                   |
| **salesorder.Products**        | crm.Feedbacks                          | Association (to-many)     | Product has many Feedbacks (on feedbacks.product = $self)                      |
| **salesorder.Producers**       | salesorder.Products                    | Association (to-many)     | Producer has many Products                                                     |
| **salesorder.Categories**      | salesorder.Categories                  | Association               | Category can reference a parent Category (parent)                              |
| **salesorder.Categories**      | salesorder.Categories (child)          | **Composition (to-many)** | Category strictly owns its child subcategories (children)                      |
| **salesorder.Orders**          | crm.Customers                          | Association               | Order is linked to a Customer                                                  |
| **salesorder.Orders**          | salesorder.OrderItems                  | **Composition (to-many)** | Order strictly consists of multiple OrderItems (line items)                    |
| **salesorder.OrderItems**      | salesorder.Orders                      | Association               | Bi-directional backlink from a line item to its parent Order                   |
| **salesorder.OrderItems**      | salesorder.Products                    | Association               | OrderItem is linked to a specific Product                                      |
| **crm.Customers**              | salesorder.Orders                      | Association (to-many)     | Customer places multiple Orders                                                |
| **crm.Customers**              | crm.Interactions                       | Association (to-many)     | Customer has a history of multiple Interactions                                |
| **crm.Customers**              | crm.Feedbacks                          | Association (to-many)     | Customer leaves multiple Feedbacks                                             |
| **crm.Customers**              | crm.CustomerNotes                      | **Composition (to-many)** | Customer strictly owns their internal notes (CustomerNotes)                    |
| **crm.Customers**              | crm.CustomersToPreferences             | Association (to-many)     | Customer is linked to the preference junction entity                           |
| **crm.Preferences**            | salesorder.Categories                  | Association               | Preference is linked to a specific game genre (productCategory)                |
| **crm.CustomersToPreferences** | crm.Customers                          | Association               | Backlink from the junction table to the Customer                               |
| **crm.CustomersToPreferences** | crm.Preferences                        | Association               | Link from the junction table to the specific Preference                        |
| **crm.Feedbacks**              | crm.Customers                          | Association               | Feedback belongs to a specific Customer                                        |
| **crm.Feedbacks**              | salesorder.Products                    | Association               | Feedback belongs to a specific Product                                         |
| **crm.CustomerNotes**          | crm.Customers                          | Association               | Backlink from the internal note to its owner Customer                          |
| **Address aspect**             | _crm.Customers / salesorder.Producers_ | **Aspect (In-line)**      | Reusable Address aspect (city, postCode, streetAddress) extending the entities |
