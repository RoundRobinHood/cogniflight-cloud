import React, { Component } from "react";

class RegistrationForm extends Component {
  //constructor for controlled component
  constructor(props) {
    super(props);

    this.state = {
      name: "",
      surname: "",
      phone: "",
      email: "",
    };
  }

  //method to set the value of the element when it is changed.
  handleChange = (event) => {
    const { name, value } = event.target;
    this.setState({ [name]: value });
  };

  render() {
    return (
      <div>
        <form>
          <h2>Pilot Registration Form</h2>
          <br></br>
          <br></br>
          <label>Name </label>
          {/* returns value of state of name, through onChange event handler */}
          <input
            type="text"
            name="name"
            value={this.state.name}
            onChange={this.handleChange}
            placeholder="Enter name"
          />
          <div>
            <label>Surname</label>
            <input
              type="text"
              name="surname"
              value={this.state.surname}
              onChange={this.handleChange}
              placeholder="Enter surname"
            />
          </div>
          <div>
            <label>Phone</label>
            <input
              type="text"
              name="phone"
              value={this.state.phone}
              onChange={this.handleChange}
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <label>Email</label>
            <input
              type="text"
              name="email"
              value={this.state.email}
              onChange={this.handleChange}
              placeholder="Enter email"
            />
          </div>
        </form>
      </div>
    );
  }
}

export default RegistrationForm;
