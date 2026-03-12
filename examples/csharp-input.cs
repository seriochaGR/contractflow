public class UserDto
{
    public Guid Id { get; set; }
    public string? DisplayName { get; set; }
    public DateTime? BirthDate { get; set; }
    public List<string> Roles { get; set; }
}

public class TeamDto
{
    public string Name { get; set; }
    public List<UserDto> Members { get; set; }
}
